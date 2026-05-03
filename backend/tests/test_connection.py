import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

from app.services.connection import ConnectionService
from app.models.database import CreateConnectionRequest, DatabaseSummaryResponse


class TestValidateUrl:
    def test_valid_postgresql_url(self):
        ok, msg = ConnectionService._validate_url("postgresql://user:pass@localhost/db")
        assert ok is True
        assert msg == ""

    def test_valid_postgresql_asyncpg_url(self):
        ok, msg = ConnectionService._validate_url("postgresql+asyncpg://user:pass@localhost/db")
        assert ok is True
        assert msg == ""

    def test_invalid_mysql_url(self):
        ok, msg = ConnectionService._validate_url("mysql://user:pass@localhost/db")
        assert ok is False
        assert "PostgreSQL" in msg

    def test_invalid_empty_url(self):
        ok, msg = ConnectionService._validate_url("")
        assert ok is False


class TestGetConnectionUrl:
    def test_converts_postgresql_prefix(self):
        result = ConnectionService.get_connection_url("postgresql://user@localhost/db")
        assert result == "postgresql+asyncpg://user@localhost/db"

    def test_keeps_asyncpg_prefix(self):
        result = ConnectionService.get_connection_url("postgresql+asyncpg://user@localhost/db")
        assert result == "postgresql+asyncpg://user@localhost/db"


class TestAddConnection:
    @pytest.mark.asyncio
    async def test_add_connection_success(self, async_session):
        with patch("app.services.connection.get_async_session_maker") as mock_sm, \
             patch.object(ConnectionService, "_test_connection", new_callable=AsyncMock, return_value=(True, "")):
            mock_sm.return_value = lambda: async_session.__class__.__class__(
                async_session.get_bind()
            )
            mock_sm.return_value = lambda: _enter_async_session(async_session)

            success, error_msg, response = await ConnectionService.add_connection(
                "mydb",
                CreateConnectionRequest(url="postgresql://user:pass@localhost/db")
            )

    @pytest.mark.asyncio
    async def test_add_connection_invalid_url(self, async_session):
        success, error_msg, response = await ConnectionService.add_connection(
            "mydb",
            CreateConnectionRequest(url="mysql://localhost/db")
        )
        assert success is False
        assert "PostgreSQL" in error_msg
        assert response is None

    @pytest.mark.asyncio
    async def test_add_connection_test_connection_fails(self, async_session):
        with patch.object(ConnectionService, "_test_connection", new_callable=AsyncMock, return_value=(False, "连接失败")):
            success, error_msg, response = await ConnectionService.add_connection(
                "mydb",
                CreateConnectionRequest(url="postgresql://user:pass@localhost/db")
            )
            assert success is False
            assert "连接失败" in error_msg


class TestListConnections:
    @pytest.mark.asyncio
    async def test_list_empty(self, async_session):
        with patch("app.services.connection.get_async_session_maker", return_value=lambda: _enter_async_session(async_session)):
            result = await ConnectionService.list_connections()
            assert result == []

    @pytest.mark.asyncio
    async def test_list_with_data(self, async_session, sample_connection_with_metadata):
        with patch("app.services.connection.get_async_session_maker", return_value=lambda: _enter_async_session(async_session)):
            result = await ConnectionService.list_connections()
            assert len(result) == 1
            assert result[0].name == "test-db-meta"
            assert result[0].table_count == 1
            assert result[0].view_count == 1


class TestDeleteConnection:
    @pytest.mark.asyncio
    async def test_delete_success(self, async_session, sample_connection):
        with patch("app.services.connection.get_async_session_maker", return_value=lambda: _enter_async_session(async_session)):
            success, error_msg = await ConnectionService.delete_connection("test-db")
            assert success is True
            assert error_msg == ""

            result = await session_execute_query(async_session, "test-db")
            assert result is None

    @pytest.mark.asyncio
    async def test_delete_not_found(self, async_session):
        with patch("app.services.connection.get_async_session_maker", return_value=lambda: _enter_async_session(async_session)):
            success, error_msg = await ConnectionService.delete_connection("nonexistent")
            assert success is False
            assert "does not exist" in error_msg


class TestGetConnection:
    @pytest.mark.asyncio
    async def test_get_existing(self, async_session, sample_connection):
        with patch("app.services.connection.get_async_session_maker", return_value=lambda: _enter_async_session(async_session)):
            result = await ConnectionService.get_connection("test-db")
            assert result is not None
            assert result.name == "test-db"

    @pytest.mark.asyncio
    async def test_get_not_found(self, async_session):
        with patch("app.services.connection.get_async_session_maker", return_value=lambda: _enter_async_session(async_session)):
            result = await ConnectionService.get_connection("nonexistent")
            assert result is None


# Helper: provide a context manager that yields the session
from contextlib import asynccontextmanager

@asynccontextmanager
async def _enter_async_session(session: AsyncSession):
    yield session


async def session_execute_query(session: AsyncSession, name: str):
    from sqlalchemy import select
    from app.db.sqlite import DatabaseConnection
    result = await session.execute(
        select(DatabaseConnection).where(DatabaseConnection.name == name)
    )
    return result.scalar_one_or_none()
