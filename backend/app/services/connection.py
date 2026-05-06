from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional
import asyncio
import json
import logging

from app.db.sqlite import DatabaseConnection, get_async_session_maker, get_engine
from app.models.database import CreateConnectionRequest, DatabaseSummaryResponse
from app.services.db_utils import ephemeral_engine

logger = logging.getLogger(__name__)


class ConnectionService:
    """Service for managing database connections."""

    @staticmethod
    def _detect_db_type(url: str) -> str:
        """Detect database type from URL scheme."""
        url_lower = url.lower()
        if url_lower.startswith("mysql://") or url_lower.startswith("mysql+"):
            return "mysql"
        if url_lower.startswith("postgresql://") or url_lower.startswith("postgresql+"):
            return "postgresql"
        return "postgresql"  # Default fallback

    @staticmethod
    def _validate_url(url: str) -> tuple[bool, str]:
        """Validate database connection URL."""
        url_lower = url.lower()
        if not (url_lower.startswith("postgresql://") or url_lower.startswith("postgresql+asyncpg://") or
                url_lower.startswith("mysql://") or url_lower.startswith("mysql+aiomysql://")):
            return False, "Only PostgreSQL and MySQL connections are supported. URL must start with postgresql:// or mysql://"
        return True, ""

    @staticmethod
    async def _test_connection(url: str) -> tuple[bool, str]:
        """Test database connection with timeout."""
        test_url = ConnectionService.get_connection_url(url)

        try:
            async with ephemeral_engine(test_url) as engine:
                async with engine.connect() as conn:
                    await asyncio.wait_for(conn.execute(select(1)), timeout=30)
            return True, ""
        except asyncio.TimeoutError:
            logger.warning("Connection test timed out")
            return False, "Database connection timeout. Please check your network or database status."
        except Exception as e:
            logger.error("Connection test failed: %s", str(e))
            return False, f"Failed to connect to database server: {str(e)}"

    @staticmethod
    async def add_connection(name: str, request: CreateConnectionRequest) -> tuple[bool, str, Optional[DatabaseSummaryResponse]]:
        """Add a new database connection.

        Returns:
            tuple: (success, error_message, response)
        """
        logger.info("Adding new database connection: %s", name)

        # Validate URL format
        is_valid, error_msg = ConnectionService._validate_url(request.url)
        if not is_valid:
            return False, error_msg, None

        # Test connection
        is_connected, error_msg = await ConnectionService._test_connection(request.url)
        if not is_connected:
            return False, error_msg, None

        # Store to SQLite
        session_maker = get_async_session_maker()
        async with session_maker() as session:
            # Check for duplicate name
            result = await session.execute(
                select(DatabaseConnection).where(DatabaseConnection.name == name)
            )
            existing = result.scalar_one_or_none()
            if existing:
                return False, f"Connection name '{name}' already exists", None

            # Create new connection
            detected_db_type = ConnectionService._detect_db_type(request.url)
            conn = DatabaseConnection(
                name=name,
                url=request.url,
                db_type=detected_db_type,
                created_at=datetime.now(timezone.utc)
            )
            session.add(conn)
            await session.commit()
            await session.refresh(conn)

            response = DatabaseSummaryResponse(
                name=conn.name,
                db_type=conn.db_type,
                table_count=0,
                view_count=0,
                created_at=conn.created_at,
                last_refreshed_at=conn.last_refreshed_at
            )
            logger.info("Successfully added database connection: %s", name)
            return True, "", response

    @staticmethod
    async def list_connections() -> list[DatabaseSummaryResponse]:
        """List all database connections."""
        logger.info("Listing all database connections")
        session_maker = get_async_session_maker()
        async with session_maker() as session:
            result = await session.execute(select(DatabaseConnection))
            connections = result.scalars().all()

            responses = []
            for conn in connections:
                # Parse metadata to get table/view counts
                table_count = 0
                view_count = 0
                if conn.metadata_json:
                    try:
                        metadata = json.loads(conn.metadata_json)
                        for table in metadata:
                            if table.get("table_type") == "BASE TABLE":
                                table_count += 1
                            elif table.get("table_type") == "VIEW":
                                view_count += 1
                    except json.JSONDecodeError as e:
                        logger.warning("Failed to parse metadata JSON for connection '%s': %s", conn.name, e)

                responses.append(DatabaseSummaryResponse(
                    name=conn.name,
                    db_type=conn.db_type,
                    table_count=table_count,
                    view_count=view_count,
                    created_at=conn.created_at,
                    last_refreshed_at=conn.last_refreshed_at
                ))

            return responses

    @staticmethod
    async def get_connection(name: str) -> Optional[DatabaseConnection]:
        """Get a database connection by name."""
        session_maker = get_async_session_maker()
        async with session_maker() as session:
            result = await session.execute(
                select(DatabaseConnection).where(DatabaseConnection.name == name)
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def delete_connection(name: str) -> tuple[bool, str]:
        """Delete a database connection.

        Returns:
            tuple: (success, error_message)
        """
        logger.info("Deleting database connection: %s", name)
        session_maker = get_async_session_maker()
        async with session_maker() as session:
            result = await session.execute(
                select(DatabaseConnection).where(DatabaseConnection.name == name)
            )
            conn = result.scalar_one_or_none()
            if not conn:
                return False, f"Connection '{name}' does not exist"

            await session.delete(conn)
            await session.commit()
            logger.info("Successfully deleted database connection: %s", name)
            return True, ""

    @staticmethod
    def get_connection_url(url: str) -> str:
        """Convert URL to async format for queries."""
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("mysql://"):
            return url.replace("mysql://", "mysql+aiomysql://", 1)
        return url
