"""Query execution service."""

from sqlalchemy import text
import time
from typing import Optional
import logging

from app.models.query import QueryRequest, QueryResultResponse
from app.services.validator import ValidatorService, ValidationError
from app.services.connection import ConnectionService
from app.services.db_utils import ephemeral_engine

logger = logging.getLogger(__name__)


class QueryService:
    """Service for executing SQL queries on database connections."""

    @staticmethod
    async def execute_query(
        connection_url: str,
        request: QueryRequest,
        default_limit: int = 1000,
        db_type: str = "postgresql"
    ) -> tuple[Optional[QueryResultResponse], str | None]:
        """Execute a SQL query on the database.

        Args:
            connection_url: Database connection URL (PostgreSQL or MySQL)
            request: Query request with SQL
            default_limit: Default LIMIT for truncation detection
            db_type: Database type for dialect-specific validation

        Returns:
            Tuple of (QueryResultResponse or None, error_message)
        """
        query_url = ConnectionService.get_connection_url(connection_url)

        # Validate and enrich SQL
        try:
            enriched_sql, _, is_truncated = ValidatorService.validate_and_enrich(
                request.sql, default_limit, db_type=db_type
            )
        except ValidationError as e:
            return None, e.message

        try:
            start_time = time.time()

            async with ephemeral_engine(query_url) as engine:
                async with engine.connect() as conn:
                    result = await conn.execute(text(enriched_sql))

                    rows = result.mappings().all()
                    column_names = list(rows[0].keys()) if rows else []
                    row_data = [dict(row) for row in rows]

                    execution_time_ms = (time.time() - start_time) * 1000

                    query_result = QueryResultResponse(
                        column_names=column_names,
                        row_data=row_data,
                        total_count=len(row_data),
                        is_truncated=is_truncated,
                        execution_time_ms=round(execution_time_ms, 2)
                    )

                    logger.info(
                        "Query executed: %d rows, %.2fms, truncated=%s",
                        len(row_data), execution_time_ms, is_truncated
                    )

                    return query_result, None

        except Exception as e:
            error_str = str(e)
            logger.error("Query execution failed: %s", error_str)
            return None, f"Query execution failed: {error_str}"
