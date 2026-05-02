from pydantic import BaseModel, ConfigDict
from typing import Optional
from pydantic.alias_generators import to_camel


class ColumnMetadata(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    data_type: str
    is_nullable: bool
    default_value: Optional[str] = None
    ordinal_position: int
    is_primary_key: bool = False


class TableMetadata(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    schema_name: str
    table_name: str
    table_type: str
    columns: list[ColumnMetadata]


class ColumnMetadataResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    data_type: str
    is_nullable: bool
    default_value: Optional[str] = None
    is_primary_key: bool = False


class TableMetadataResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    schema_name: str
    table_name: str
    table_type: str
    columns: list[ColumnMetadataResponse]
