from fastapi import APIRouter, HTTPException, status, Depends
from typing import Any

from app.models.database import CreateConnectionRequest, DatabaseSummaryResponse, DatabaseDetailResponse
from app.models.query import QueryRequest, QueryResultResponse, NaturalQueryRequest, NLQueryResponse
from app.models.metadata import TableMetadata
from app.services.connection import ConnectionService
from app.services.metadata import MetadataService
from app.services.query import QueryService
from app.services.nl_to_sql import NLToSQLService
from app.config import Settings, get_settings


router = APIRouter(prefix="/databases")


@router.get("", response_model=list[DatabaseSummaryResponse])
async def list_databases() -> list[DatabaseSummaryResponse]:
    """List all database connections."""
    return await ConnectionService.list_connections()


@router.put("/{name}", response_model=DatabaseSummaryResponse, status_code=status.HTTP_201_CREATED)
async def add_database(name: str, request: CreateConnectionRequest) -> DatabaseSummaryResponse:
    """Add a new database connection.

    Validates the URL format, tests the connection, and stores it.
    """
    success, error_msg, response = await ConnectionService.add_connection(name, request)

    if not success:
        if "already exists" in error_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)

    return response


@router.get("/{name}", response_model=DatabaseDetailResponse)
async def get_database(name: str) -> DatabaseDetailResponse:
    """Get database details with fresh metadata."""
    success, error_msg, response = await MetadataService.get_metadata_with_refresh(name, force_refresh=True)

    if not success:
        if "does not exist" in error_msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)

    return response


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_database(name: str) -> None:
    """Delete a database connection."""
    success, error_msg = await ConnectionService.delete_connection(name)

    if not success:
        if "does not exist" in error_msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg)


@router.post("/{name}/query", response_model=QueryResultResponse)
async def execute_query(name: str, request: QueryRequest) -> QueryResultResponse:
    """Execute a SQL query on the database.

    Validates the SQL (must be SELECT), injects LIMIT if missing,
    and returns results.
    """
    # Get connection from database
    connection = await ConnectionService.get_connection(name)

    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database connection does not exist")

    # Execute query
    result, error_msg = await QueryService.execute_query(connection.url, request)

    if error_msg:
        # Determine appropriate status code
        if "Only SELECT" in error_msg or "Syntax error" in error_msg:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)

    return result


@router.post("/{name}/query/natural", response_model=NLQueryResponse)
async def natural_query(
    name: str,
    request: NaturalQueryRequest,
    settings: Settings = Depends(get_settings)
) -> NLQueryResponse:
    """Generate SQL from natural language question.

    Uses OpenAI GPT-4o to convert Chinese natural language questions
    into SQL queries based on the database schema.
    """
    # Validate prompt
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Prompt cannot be empty")

    # Get database metadata for context
    success, error_msg, db_detail = await MetadataService.get_metadata_with_refresh(
        name, force_refresh=False
    )

    if not success:
        if "does not exist" in error_msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)

    # Convert dict response to TableMetadata objects
    tables = [
        TableMetadata(
            schema_name=t["schema_name"],
            table_name=t["table_name"],
            table_type=t["table_type"],
            columns=[
                {
                    "name": c["name"],
                    "data_type": c["data_type"],
                    "is_nullable": c["is_nullable"],
                    "default_value": c.get("default_value"),
                    "ordinal_position": 0,
                    "is_primary_key": c.get("is_primary_key", False)
                }
                for c in t["columns"]
            ]
        )
        for t in db_detail.tables
    ]

    # Generate SQL using OpenAI
    success, error_msg, result = await NLToSQLService.generate_sql(
        question=request.prompt,
        tables=tables,
        settings=settings
    )

    if not success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)

    return result
