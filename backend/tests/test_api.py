import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.db.sqlite import Base, DatabaseConnection
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from datetime import datetime, timezone


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def client():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    with patch("app.services.connection.get_async_session_maker", return_value=session_maker), \
         patch("app.services.metadata.get_async_session_maker", return_value=session_maker):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


class TestListDatabases:
    @pytest.mark.asyncio
    async def test_list_empty(self, client: AsyncClient):
        response = await client.get("/api/v1/dbs")
        assert response.status_code == 200
        assert response.json() == []


class TestAddDatabase:
    @pytest.mark.asyncio
    async def test_add_invalid_url(self, client: AsyncClient):
        response = await client.put(
            "/api/v1/dbs/test",
            json={"url": "mysql://localhost/db"}
        )
        assert response.status_code == 502

    @pytest.mark.asyncio
    async def test_add_valid_connection(self, client: AsyncClient):
        with patch("app.services.connection.ConnectionService._test_connection", new_callable=AsyncMock, return_value=(True, "")):
            response = await client.put(
                "/api/v1/dbs/mydb",
                json={"url": "postgresql://user:pass@localhost/db"}
            )
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "mydb"
            assert data["dbType"] == "postgresql"

    @pytest.mark.asyncio
    async def test_add_duplicate(self, client: AsyncClient):
        with patch("app.services.connection.ConnectionService._test_connection", new_callable=AsyncMock, return_value=(True, "")):
            await client.put("/api/v1/dbs/dup", json={"url": "postgresql://localhost/db"})
            response = await client.put("/api/v1/dbs/dup", json={"url": "postgresql://localhost/db"})
            assert response.status_code == 409


class TestGetDatabase:
    @pytest.mark.asyncio
    async def test_get_not_found(self, client: AsyncClient):
        response = await client.get("/api/v1/dbs/nonexistent")
        assert response.status_code == 404


class TestDeleteDatabase:
    @pytest.mark.asyncio
    async def test_delete_not_found(self, client: AsyncClient):
        response = await client.delete("/api/v1/dbs/nonexistent")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_success(self, client: AsyncClient):
        with patch("app.services.connection.ConnectionService._test_connection", new_callable=AsyncMock, return_value=(True, "")):
            await client.put("/api/v1/dbs/todelete", json={"url": "postgresql://localhost/db"})
            response = await client.delete("/api/v1/dbs/todelete")
            assert response.status_code == 204
