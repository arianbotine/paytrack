from src.domain.exceptions.errors import ValidationError
from src.domain.interfaces.llm_provider import LLMProvider
from src.infrastructure.config.settings import Settings
from src.infrastructure.llm.gemini_provider import GeminiProvider
from src.infrastructure.llm.openrouter_provider import OpenRouterProvider


class LLMFactory:
    @staticmethod
    def create(settings: Settings) -> LLMProvider:
        if settings.llm_provider == 'gemini':
            return GeminiProvider(
                api_key=settings.gemini_api_key,
                model=settings.gemini_model,
            )
        if settings.llm_provider == 'openrouter':
            return OpenRouterProvider(
                api_key=settings.openrouter_api_key,
                model=settings.openrouter_model,
            )
        raise ValidationError('Unsupported LLM provider')
