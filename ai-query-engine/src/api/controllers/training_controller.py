from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.dependencies.container import get_training_use_case
from src.api.schemas.training import TrainingRequest, TrainingResponse
from src.application.use_cases.training_use_case import TrainingUseCase
from src.security.guards.api_key_guard import validate_api_key

router = APIRouter(tags=['training'])


@router.post('/training', dependencies=[Depends(validate_api_key)])
def train(
    payload: TrainingRequest,
    use_case: Annotated[TrainingUseCase, Depends(get_training_use_case)],
) -> TrainingResponse:
    return use_case.execute(payload)
