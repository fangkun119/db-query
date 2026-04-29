from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional
import asyncio

from app.db.sqlite import DatabaseConnection, get_async_session_maker, get_engine
from app.models.database import CreateConnectionRequest, DatabaseSummaryResponse


class ConnectionService:
    """Service for managing database connections."""

    @staticmethod
    def _validate_url(url: str) -> tuple[bool, str]:
        """Validate PostgreSQL connection URL."""
        if not url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            return False, "仅支持 PostgreSQL 连接，URL 必须以 postgresql:// 或 postgresql+asyncpg:// 开头"
        return True, ""

    @staticmethod
    async def _test_connection(url: str) -> tuple[bool, str]:
        """Test database connection with timeout."""
        # Ensure URL uses asyncpg driver
        if url.startswith("postgresql://"):
            test_url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        else:
            test_url = url

        engine = None
        try:
            engine = create_async_engine(test_url, poolclass=NullPool)
            async with engine.connect() as conn:
                # Simple query to test connection
                await conn.execute(select(1))
            return True, ""
        except asyncio.TimeoutError:
            return False, "连接数据库超时，请检查网络或数据库状态"
        except Exception as e:
            return False, f"无法连接到数据库服务器：{str(e)}"
        finally:
            if engine:
                await engine.dispose()

    @staticmethod
    async def add_connection(name: str, request: CreateConnectionRequest) -> tuple[bool, str, Optional[DatabaseSummaryResponse]]:
        """Add a new database connection.

        Returns:
            tuple: (success, error_message, response)
        """
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
                return False, f"连接名称 '{name}' 已存在", None

            # Create new connection
            conn = DatabaseConnection(
                name=name,
                url=request.url,
                db_type="postgresql",
                status="active",
                created_at=datetime.now(timezone.utc)
            )
            session.add(conn)
            await session.commit()
            await session.refresh(conn)

            response = DatabaseSummaryResponse(
                name=conn.name,
                db_type=conn.db_type,
                status=conn.status,
                table_count=0,
                view_count=0,
                created_at=conn.created_at,
                last_refreshed_at=conn.last_refreshed_at
            )
            return True, "", response

    @staticmethod
    async def list_connections() -> list[DatabaseSummaryResponse]:
        """List all database connections."""
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
                    import json
                    try:
                        metadata = json.loads(conn.metadata_json)
                        for table in metadata:
                            if table.get("table_type") == "BASE TABLE":
                                table_count += 1
                            elif table.get("table_type") == "VIEW":
                                view_count += 1
                    except json.JSONDecodeError:
                        pass

                responses.append(DatabaseSummaryResponse(
                    name=conn.name,
                    db_type=conn.db_type,
                    status=conn.status,
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
        session_maker = get_async_session_maker()
        async with session_maker() as session:
            result = await session.execute(
                select(DatabaseConnection).where(DatabaseConnection.name == name)
            )
            conn = result.scalar_one_or_none()
            if not conn:
                return False, f"连接 '{name}' 不存在"

            await session.delete(conn)
            await session.commit()
            return True, ""

    @staticmethod
    async def update_connection_status(name: str, status: str) -> None:
        """Update connection status."""
        session_maker = get_async_session_maker()
        async with session_maker() as session:
            result = await session.execute(
                select(DatabaseConnection).where(DatabaseConnection.name == name)
            )
            conn = result.scalar_one_or_none()
            if conn:
                conn.status = status
                await session.commit()

    @staticmethod
    def get_connection_url(url: str) -> str:
        """Convert URL to asyncpg format for queries."""
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
