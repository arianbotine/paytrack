from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    app_env: str = 'development'
    log_level: str = 'INFO'
    app_name: str = 'ai-query-engine'

    postgres_host: str = 'localhost'
    postgres_port: int = 5432
    postgres_db: str = 'paytrack'
    postgres_user: str = 'paytrack'
    postgres_password: str = 'paytrack123'

    llm_provider: str = 'gemini'
    gemini_api_key: str = ''
    gemini_model: str = 'gemini-2.5-flash'
    openrouter_api_key: str = ''
    openrouter_model: str = 'qwen/qwen3-8b:free'

    text_to_sql_provider: str = 'vanna'
    vanna_retrieval_limit: int = 5
    vanna_training_storage_path: str = 'data/vanna/training_store.json'
    vanna_max_question_sql_per_org: int = 300
    query_limit: int = 100
    query_timeout_seconds: int = 10

    context_glossary_path: str = 'src/context/glossary/glossary.yaml'
    context_examples_path: str = 'src/context/examples/examples.yaml'

    ai_engine_api_key: str = 'change-me'

    @property
    def sqlalchemy_database_url(self) -> str:
        return (
            f'postgresql+psycopg://{self.postgres_user}:{self.postgres_password}'
            f'@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}'
        )

    @property
    def glossary_file_path(self) -> Path:
        return Path(self.context_glossary_path)

    @property
    def examples_file_path(self) -> Path:
        return Path(self.context_examples_path)

    @property
    def vanna_training_storage_file_path(self) -> Path:
        return Path(self.vanna_training_storage_path)

    @field_validator('llm_provider')
    @classmethod
    def validate_llm_provider(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in {'gemini', 'openrouter'}:
            raise ValueError('LLM_PROVIDER must be gemini or openrouter')
        return normalized

    @field_validator('text_to_sql_provider')
    @classmethod
    def validate_text_to_sql_provider(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in {'vanna', 'vanna_oss'}:
            raise ValueError('TEXT_TO_SQL_PROVIDER must be vanna or vanna_oss')
        return normalized


@lru_cache
def get_settings() -> Settings:
    return Settings()
