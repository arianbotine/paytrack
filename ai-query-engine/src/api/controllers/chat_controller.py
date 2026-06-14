from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.dependencies.container import get_chat_use_case
from src.api.schemas.chat import ChatRequest, ChatResponse
from src.application.use_cases.chat_use_case import ChatUseCase
from src.security.guards.api_key_guard import validate_api_key

router = APIRouter(tags=['chat'])


@router.post('/chat', dependencies=[Depends(validate_api_key)])
def chat(
    payload: ChatRequest,
    use_case: Annotated[ChatUseCase, Depends(get_chat_use_case)],
) -> ChatResponse:
    return use_case.execute(
        message=payload.message,
        organization_id=payload.organization_id,
        response_mode=payload.response_mode,
    )
