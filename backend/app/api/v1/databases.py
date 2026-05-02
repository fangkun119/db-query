from fastapi import APIRouter, HTTPException, status
from typing import Any

from app.models.database import CreateConnectionRequest, DatabaseSummaryResponse, DatabaseDetailResponse
from app.models.query import QueryRequest, QueryResultResponse
from app.services.connection import ConnectionService
from app.services.metadata import MetadataService
from app.services.query import QueryService


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
        if "已存在" in error_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)

    return response


@router.get("/{name}", response_model=DatabaseDetailResponse)
async def get_database(name: str) -> DatabaseDetailResponse:
    """Get database details with fresh metadata."""
    success, error_msg, response = await MetadataService.get_metadata_with_refresh(name, force_refresh=True)

    if not success:
        if "不存在" in error_msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)

    return response


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_database(name: str) -> None:
    """Delete a database connection."""
    success, error_msg = await ConnectionService.delete_connection(name)

    if not success:
        if "不存在" in error_msg:
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据库连接不存在")

    # Execute query
    result, error_msg = await QueryService.execute_query(connection.url, request)

    if error_msg:
        # Determine appropriate status code
        if "仅支持 SELECT" in error_msg or "语法错误" in error_msg:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)

    return result
