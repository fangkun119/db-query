from pydantic import BaseModel, ConfigDict
from typing import Any, Optional
from pydantic.alias_generators import to_camel


class QueryRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    sql: str


class NaturalQueryRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prompt: str


class QueryResultResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    column_names: list[str]
    row_data: list[dict[str, Any]]
    total_count: int
    is_truncated: bool
    execution_time_ms: float


class NLQueryResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    sql: str
    explanation: Optional[str] = None
