from fastapi import Header

from src.domain.exceptions.errors import UnauthorizedError
from src.infrastructure.config.settings import Settings


class APIKeyGuard:
    def __init__(self, settings: Settings):
        self.settings = settings

    def validate(self, api_key: str | None) -> None:
        if not api_key or api_key != self.settings.ai_engine_api_key:
            raise UnauthorizedError('Invalid API key')


def validate_api_key(
    x_api_key: str | None = Header(default=None, alias='x-api-key'),
) -> None:
    from src.infrastructure.config.settings import get_settings

    settings: Settings = get_settings()
    guard = APIKeyGuard(settings=settings)
    guard.validate(x_api_key)
