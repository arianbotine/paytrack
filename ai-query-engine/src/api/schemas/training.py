from pydantic import BaseModel, Field, model_validator


class TrainingRequest(BaseModel):
    organization_id: str = Field(min_length=1, max_length=64)
    question: str | None = Field(default=None, min_length=1, max_length=4000)
    sql: str | None = Field(default=None, min_length=1, max_length=20000)
    ddl: str | None = Field(default=None, min_length=1, max_length=50000)
    documentation: str | None = Field(default=None, min_length=1, max_length=50000)

    @model_validator(mode='after')
    def validate_payload(self) -> 'TrainingRequest':
        has_qsql = bool(self.question and self.sql)
        has_ddl = bool(self.ddl)
        has_doc = bool(self.documentation)

        selected = int(has_qsql) + int(has_ddl) + int(has_doc)
        if selected != 1:
            raise ValueError(
                'Send exactly one training mode: question+sql, ddl, or documentation'
            )

        if (self.question and not self.sql) or (self.sql and not self.question):
            raise ValueError('question and sql must be sent together')

        return self


class TrainingResponse(BaseModel):
    id: str
    status: str = 'stored'
