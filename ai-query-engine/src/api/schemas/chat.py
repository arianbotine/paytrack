from pydantic import BaseModel, Field
from typing import Literal


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    organization_id: str = Field(min_length=1, max_length=64)
    response_mode: Literal['basic', 'advanced'] = 'basic'


class VisualizationSuggestion(BaseModel):
    type: str
    x: str | None = None
    y: str | None = None


class ChatMetadata(BaseModel):
    provider: str
    execution_time_ms: int
    response_mode: Literal['basic', 'advanced'] = 'basic'
    sql_source: str | None = None
    row_count: int = 0
    column_count: int = 0


class ChatDiagnosticsTimings(BaseModel):
    context_build_ms: int = 0
    sql_generation_ms: int = 0
    sql_validation_ms: int = 0
    query_execution_ms: int = 0
    insight_generation_ms: int = 0
    visualization_ms: int = 0
    total_ms: int = 0


class ChatDiagnostics(BaseModel):
    sql_generated: bool = False
    sql_validated: bool = False
    query_executed: bool = False
    used_fallback_answer: bool = False
    rows_returned: int = 0
    columns_returned: int = 0
    visualization_type: str = 'table'
    timings: ChatDiagnosticsTimings


class ChatResponse(BaseModel):
    answer: str
    sql: str
    columns: list[str]
    rows: list[dict]
    visualization: VisualizationSuggestion
    metadata: ChatMetadata
    diagnostics: ChatDiagnostics
