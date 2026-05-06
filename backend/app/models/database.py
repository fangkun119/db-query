from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from pydantic.alias_generators import to_camel

# Re-export metadata types to avoid duplication
from app.models.metadata import ColumnMetadataResponse, TableMetadataResponse


class CreateConnectionRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    url: str


class DatabaseSummaryResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    db_type: str
    table_count: int
    view_count: int
    created_at: datetime
    last_refreshed_at: Optional[datetime] = None


class DatabaseDetailResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    db_type: str
    tables: list[TableMetadataResponse]
    created_at: datetime
    last_refreshed_at: Optional[datetime] = None
