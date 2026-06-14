from functools import lru_cache

from src.application.services.context_builder import ContextBuilder
from src.application.services.insight_service import InsightService
from src.application.services.visualization_service import VisualizationService
from src.application.use_cases.chat_use_case import ChatUseCase
from src.application.use_cases.training_use_case import TrainingUseCase
from src.domain.interfaces.llm_provider import LLMProvider
from src.domain.interfaces.text_to_sql import TextToSQLService
from src.infrastructure.config.settings import Settings, get_settings
from src.infrastructure.datasource.postgres_datasource import PostgresDataSource
from src.infrastructure.llm.cached_provider import CachedLLMProvider
from src.infrastructure.llm.factory import LLMFactory
from src.infrastructure.text_to_sql.vanna_local_training_provider import (
    VannaLocalTrainingProvider,
)
from src.infrastructure.text_to_sql.vanna_oss_service import VannaOSSTextToSQLService
from src.infrastructure.text_to_sql.vanna_service import VannaTextToSQLService
from src.security.validators.sql_validator import SQLValidator


@lru_cache
def get_data_source() -> PostgresDataSource:
    settings = get_settings()
    return PostgresDataSource(settings=settings)


@lru_cache
def get_context_builder() -> ContextBuilder:
    settings = get_settings()
    return ContextBuilder(
        data_source=get_data_source(),
        glossary_path=settings.glossary_file_path,
        examples_path=settings.examples_file_path,
    )


@lru_cache
def get_training_provider() -> VannaLocalTrainingProvider:
    settings = get_settings()
    return VannaLocalTrainingProvider(
        storage_path=settings.vanna_training_storage_file_path,
        max_question_sql_per_org=settings.vanna_max_question_sql_per_org,
    )


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    return CachedLLMProvider(LLMFactory.create(settings))


@lru_cache
def get_text_to_sql_service() -> TextToSQLService:
    settings = get_settings()
    llm_provider = get_llm_provider()

    if settings.text_to_sql_provider == 'vanna_oss':
        return VannaOSSTextToSQLService(
            llm_provider=llm_provider,
            training_provider=get_training_provider(),
            retrieval_limit=settings.vanna_retrieval_limit,
        )

    # Backward-compatible provider that uses prompt-only SQL generation.
    return VannaTextToSQLService(llm_provider=llm_provider)


@lru_cache
def get_chat_use_case() -> ChatUseCase:
    settings: Settings = get_settings()
    llm_provider = get_llm_provider()

    return ChatUseCase(
        context_builder=get_context_builder(),
        text_to_sql_service=get_text_to_sql_service(),
        sql_validator=SQLValidator(
            query_limit=settings.query_limit,
        ),
        data_source=get_data_source(),
        insight_service=InsightService(llm_provider=llm_provider),
        visualization_service=VisualizationService(),
        provider_name=settings.llm_provider,
    )


@lru_cache
def get_training_use_case() -> TrainingUseCase:
    return TrainingUseCase(text_to_sql_service=get_text_to_sql_service())
