from src.api.schemas.training import TrainingRequest, TrainingResponse
from src.domain.exceptions.errors import ValidationError
from src.domain.interfaces.text_to_sql import TextToSQLService


class TrainingUseCase:
    def __init__(self, text_to_sql_service: TextToSQLService):
        self.text_to_sql_service = text_to_sql_service

    def execute(self, payload: TrainingRequest) -> TrainingResponse:
        if payload.question and payload.sql:
            item_id = self._call_training_method(
                method_name='train_question_sql',
                organization_id=payload.organization_id,
                value_1=payload.question,
                value_2=payload.sql,
            )
            return TrainingResponse(id=item_id)

        if payload.ddl:
            item_id = self._call_training_method(
                method_name='train_ddl',
                organization_id=payload.organization_id,
                value_1=payload.ddl,
            )
            return TrainingResponse(id=item_id)

        if payload.documentation:
            item_id = self._call_training_method(
                method_name='train_documentation',
                organization_id=payload.organization_id,
                value_1=payload.documentation,
            )
            return TrainingResponse(id=item_id)

        raise ValidationError('Invalid training payload')

    def _call_training_method(
        self,
        method_name: str,
        organization_id: str,
        value_1: str,
        value_2: str | None = None,
    ) -> str:
        method = getattr(self.text_to_sql_service, method_name, None)
        if not callable(method):
            raise ValidationError(
                'Training endpoint requires TEXT_TO_SQL_PROVIDER=vanna_oss'
            )

        if method_name == 'train_ddl':
            return str(method(organization_id=organization_id, ddl=value_1))
        if method_name == 'train_documentation':
            return str(method(organization_id=organization_id, documentation=value_1))
        if method_name == 'train_question_sql' and value_2 is not None:
            return str(
                method(
                    organization_id=organization_id,
                    question=value_1,
                    sql=value_2,
                )
            )

        raise ValidationError('Invalid training method invocation')
