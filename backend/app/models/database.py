from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from pydantic.alias_generators import to_camel


class CreateConnectionRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    url: str


class DatabaseSummaryResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    db_type: str
    status: str
    table_count: int
    view_count: int
    created_at: datetime
    last_refreshed_at: Optional[datetime] = None


class ColumnMetadataResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    data_type: str
    is_nullable: bool
    default_value: Optional[str] = None


class TableMetadataResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    schema_name: str
    table_name: str
    table_type: str
    columns: list[ColumnMetadataResponse]


class DatabaseDetailResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    db_type: str
    status: str
    tables: list[TableMetadataResponse]
    created_at: datetime
    last_refreshed_at: Optional[datetime] = None
