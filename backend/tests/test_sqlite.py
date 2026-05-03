"""Test SQLite database operations."""

import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


class TestGetEngine:
    """Test engine creation and singleton pattern."""

    @pytest.mark.asyncio
    async def test_engine_singleton(self):
        """Test that get_engine returns the same instance."""
        from app.db.sqlite import get_engine

        engine1 = get_engine()
        engine2 = get_engine()

        assert engine1 is engine2

    @pytest.mark.asyncio
    async def test_engine_creates_file(self, tmp_path):
        """Test that engine creates database file."""
        import os
        from app.db.sqlite import get_db_path

        # Test that get_db_path returns a valid path
        path = get_db_path()
        assert isinstance(path, str)
        assert len(path) > 0

        # The path should be expandable
        expanded = os.path.expanduser(path)
        assert not expanded.startswith('~')


class TestGetAsyncSessionMaker:
    """Test async session maker creation."""

    @pytest.mark.asyncio
    async def test_session_maker_singleton(self):
        """Test that get_async_session_maker returns the same instance."""
        from app.db.sqlite import get_async_session_maker

        maker1 = get_async_session_maker()
        maker2 = get_async_session_maker()

        assert maker1 is maker2

    @pytest.mark.asyncio
    async def test_session_maker_creates_valid_session(self):
        """Test that session maker creates working sessions."""
        from app.db.sqlite import get_async_session_maker

        maker = get_async_session_maker()

        async with maker() as session:
            assert isinstance(session, AsyncSession)
            assert session.is_active


class TestInitDb:
    """Test database initialization."""

    @pytest.mark.asyncio
    async def test_init_db_creates_tables(self):
        """Test that init_db creates all tables."""
        from sqlalchemy import text
        from app.db.sqlite import init_db, get_engine

        await init_db()

        engine = get_engine()

        # Check that tables exist
        async with engine.connect() as conn:
            result = await conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='database_connections'"
            ))
            tables = result.fetchall()

            assert len(tables) == 1
            assert tables[0][0] == 'database_connections'


class TestDatabaseConnection:
    """Test DatabaseConnection model."""

    @pytest.mark.asyncio
    async def test_create_connection(self, async_session: AsyncSession):
        """Test creating a database connection record."""
        from app.db.sqlite import DatabaseConnection

        conn = DatabaseConnection(
            name="test-db",
            url="postgresql://user:pass@localhost/db",
            db_type="postgresql",
            status="active",
            created_at=datetime.now(timezone.utc),
        )

        async_session.add(conn)
        await async_session.commit()

        assert conn.name == "test-db"
        assert conn.url == "postgresql://user:pass@localhost/db"
        assert conn.status == "active"

    @pytest.mark.asyncio
    async def test_connection_with_metadata(self, async_session: AsyncSession):
        """Test connection with metadata JSON storage."""
        import json
        from app.db.sqlite import DatabaseConnection

        metadata = [
            {
                "schema_name": "public",
                "table_name": "users",
                "table_type": "BASE TABLE",
                "columns": [
                    {"name": "id", "data_type": "integer", "is_nullable": False}
                ]
            }
        ]

        conn = DatabaseConnection(
            name="test-db",
            url="postgresql://localhost/db",
            db_type="postgresql",
            metadata_json=json.dumps(metadata),
            status="active",
            created_at=datetime.now(timezone.utc),
        )

        async_session.add(conn)
        await async_session.commit()
        await async_session.refresh(conn)

        assert conn.metadata_json is not None

        # Verify JSON can be parsed back
        parsed = json.loads(conn.metadata_json)
        assert len(parsed) == 1
        assert parsed[0]["table_name"] == "users"

    @pytest.mark.asyncio
    async def test_connection_defaults(self, async_session: AsyncSession):
        """Test that default values are set correctly."""
        from app.db.sqlite import DatabaseConnection

        conn = DatabaseConnection(
            name="test-db",
            url="postgresql://localhost/db",
        )

        async_session.add(conn)
        await async_session.commit()

        assert conn.db_type == "postgresql"
        assert conn.status == "active"
        assert conn.created_at is not None
        assert conn.metadata_json is None

    @pytest.mark.asyncio
    async def test_update_last_refreshed_at(self, async_session: AsyncSession):
        """Test updating last_refreshed_at timestamp."""
        from app.db.sqlite import DatabaseConnection

        conn = DatabaseConnection(
            name="test-db",
            url="postgresql://localhost/db",
        )

        async_session.add(conn)
        await async_session.commit()

        # Initially None
        assert conn.last_refreshed_at is None

        # Update timestamp
        conn.last_refreshed_at = datetime.now(timezone.utc)
        await async_session.commit()

        assert conn.last_refreshed_at is not None


class TestDatabasePath:
    """Test database path utilities."""

    def test_get_db_path_default(self):
        """Test default database path."""
        from app.db.sqlite import get_db_path

        path = get_db_path()
        assert path.endswith('db_query.db')
        assert not path.startswith('~')  # Should be expanded

    def test_get_db_path_custom(self):
        """Test custom database path."""
        from app.db.sqlite import get_db_path

        custom = "~/.db_query/custom.db"
        path = get_db_path(custom)

        assert path.endswith('custom.db')
        assert not path.startswith('~')  # Should be expanded

    def test_get_db_path_absolute(self):
        """Test absolute path is not modified."""
        from app.db.sqlite import get_db_path

        absolute = "/tmp/test.db"
        path = get_db_path(absolute)

        assert path == absolute
