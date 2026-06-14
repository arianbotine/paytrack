import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.api.controllers.chat_controller import router as chat_router
from src.api.controllers.health_controller import router as health_router
from src.api.controllers.training_controller import router as training_router
from src.domain.exceptions.errors import AppError
from src.infrastructure.config.logging import setup_logging
from src.infrastructure.config.settings import get_settings

settings = get_settings()
setup_logging(settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(title='AI Query Engine', version='1.0.0')
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(training_router)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={'message': exc.message},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception('Unhandled error', extra={'error': str(exc)})
    return JSONResponse(
        status_code=500,
        content={'message': 'Internal server error'},
    )
