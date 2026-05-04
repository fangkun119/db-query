"""Query execution service."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import text
import time
from typing import Optional
import logging

from app.models.query import QueryRequest, QueryResultResponse
from app.services.validator import ValidatorService, ValidationError

logger = logging.getLogger(__name__)


class QueryService:
    """Service for executing SQL queries on database connections."""

    @staticmethod
    async def execute_query(
        connection_url: str,
        request: QueryRequest,
        default_limit: int = 1000
    ) -> tuple[Optional[QueryResultResponse], str | None]:
        """Execute a SQL query on the database.

        Args:
            connection_url: PostgreSQL connection URL
            request: Query request with SQL
            default_limit: Default LIMIT for truncation detection

        Returns:
            Tuple of (QueryResultResponse or None, error_message)
        """
        # Convert to asyncpg URL if needed
        if connection_url.startswith("postgresql://"):
            query_url = connection_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        else:
            query_url = connection_url

        # Validate and enrich SQL
        try:
            enriched_sql, _ = ValidatorService.validate_and_enrich(request.sql, default_limit)
        except ValidationError as e:
            return None, e.message

        # Check if LIMIT was injected (for truncation detection)
        original_had_limit = " LIMIT " in request.sql.upper() or " limit " in request.sql
        is_truncated = not original_had_limit and default_limit > 0

        engine = None
        try:
            start_time = time.time()

            engine = create_async_engine(query_url, poolclass=NullPool)

            async with engine.connect() as conn:
                result = await conn.execute(text(enriched_sql))

                # Get column names from result keys
                if result.returns_rows:
                    rows = result.mappings().all()
                    if rows:
                        column_names = list(rows[0].keys())
                        # Convert RowMapping to dict
                        row_data = [dict(row) for row in rows]
                    else:
                        # Empty result set - need to get column names from result.description
                        # For this, we need to fetch with rows
                        column_names = []
                        row_data = []
                else:
                    # No rows returned (shouldn't happen with our validation)
                    column_names = []
                    row_data = []

                execution_time_ms = (time.time() - start_time) * 1000

                query_result = QueryResultResponse(
                    column_names=column_names,
                    row_data=row_data,
                    total_count=len(row_data),
                    is_truncated=is_truncated,
                    execution_time_ms=round(execution_time_ms, 2)
                )

                logger.info(
                    f"Query executed successfully: {len(row_data)} rows, "
                    f"{execution_time_ms:.2f}ms, truncated={is_truncated}"
                )

                return query_result, None

        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            return None, f"Query execution failed: {str(e)}"

        finally:
            if engine:
                await engine.dispose()
