import pytest
import json
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

from app.services.metadata import MetadataService
from app.models.metadata import TableMetadata, ColumnMetadata


class TestSerializeParseRoundtrip:
    def test_roundtrip(self):
        metadata = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(name="id", data_type="integer", is_nullable=False, default_value=None, ordinal_position=1),
                    ColumnMetadata(name="name", data_type="varchar", is_nullable=True, default_value="'unknown'", ordinal_position=2),
                ],
            ),
        ]

        serialized = MetadataService._serialize_metadata(metadata)
        parsed = MetadataService._parse_metadata(serialized)

        assert len(parsed) == 1
        assert parsed[0].schema_name == "public"
        assert parsed[0].table_name == "users"
        assert parsed[0].table_type == "BASE TABLE"
        assert len(parsed[0].columns) == 2
        assert parsed[0].columns[0].name == "id"
        assert parsed[0].columns[0].data_type == "integer"
        assert parsed[0].columns[0].is_nullable is False
        assert parsed[0].columns[1].name == "name"
        assert parsed[0].columns[1].is_nullable is True
        assert parsed[0].columns[1].default_value == "'unknown'"

    def test_roundtrip_multiple_tables(self):
        metadata = [
            TableMetadata(schema_name="public", table_name="t1", table_type="BASE TABLE", columns=[]),
            TableMetadata(schema_name="public", table_name="t2", table_type="VIEW", columns=[]),
        ]
        serialized = MetadataService._serialize_metadata(metadata)
        parsed = MetadataService._parse_metadata(serialized)
        assert len(parsed) == 2

    def test_roundtrip_empty(self):
        serialized = MetadataService._serialize_metadata([])
        parsed = MetadataService._parse_metadata(serialized)
        assert parsed == []


class TestParseEmptyJson:
    def test_empty_string(self):
        result = MetadataService._parse_metadata("")
        assert result == []

    def test_none_like(self):
        result = MetadataService._parse_metadata("")
        assert result == []

    def test_valid_empty_array(self):
        result = MetadataService._parse_metadata("[]")
        assert result == []


class TestGetMetadataWithRefresh:
    @pytest.mark.asyncio
    async def test_not_found(self, async_session):
        with patch("app.services.metadata.get_async_session_maker", return_value=lambda: _ctx_mgr(async_session)):
            success, error_msg, response = await MetadataService.get_metadata_with_refresh("nonexistent")
            assert success is False
            assert "不存在" in error_msg
            assert response is None

    @pytest.mark.asyncio
    async def test_from_cache(self, async_session, sample_connection_with_metadata):
        with patch("app.services.metadata.get_async_session_maker", return_value=lambda: _ctx_mgr(async_session)):
            success, error_msg, response = await MetadataService.get_metadata_with_refresh("test-db-meta", force_refresh=False)
            assert success is True
            assert error_msg == ""
            assert response is not None
            assert response.name == "test-db-meta"
            assert len(response.tables) == 2

    @pytest.mark.asyncio
    async def test_force_refresh(self, async_session, sample_connection):
        mock_metadata = [
            TableMetadata(
                schema_name="public",
                table_name="orders",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(name="id", data_type="integer", is_nullable=False, default_value=None, ordinal_position=1),
                ],
            ),
        ]

        with patch("app.services.metadata.get_async_session_maker", return_value=lambda: _ctx_mgr(async_session)), \
             patch.object(MetadataService, "fetch_metadata", new_callable=AsyncMock, return_value=(True, "", mock_metadata)):
            success, error_msg, response = await MetadataService.get_metadata_with_refresh("test-db", force_refresh=True)
            assert success is True
            assert response is not None
            assert len(response.tables) == 1
            assert response.tables[0].table_name == "orders"

    @pytest.mark.asyncio
    async def test_force_refresh_fetch_fails(self, async_session, sample_connection):
        with patch("app.services.metadata.get_async_session_maker", return_value=lambda: _ctx_mgr(async_session)), \
             patch.object(MetadataService, "fetch_metadata", new_callable=AsyncMock, return_value=(False, "连接超时", None)):
            success, error_msg, response = await MetadataService.get_metadata_with_refresh("test-db", force_refresh=True)
            assert success is False
            assert "连接超时" in error_msg

    @pytest.mark.asyncio
    async def test_auto_fetch_when_no_cache(self, async_session, sample_connection):
        mock_metadata = [
            TableMetadata(schema_name="public", table_name="t", table_type="BASE TABLE", columns=[]),
        ]

        with patch("app.services.metadata.get_async_session_maker", return_value=lambda: _ctx_mgr(async_session)), \
             patch.object(MetadataService, "fetch_metadata", new_callable=AsyncMock, return_value=(True, "", mock_metadata)):
            success, error_msg, response = await MetadataService.get_metadata_with_refresh("test-db", force_refresh=False)
            assert success is True
            assert response is not None


from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession

@asynccontextmanager
async def _ctx_mgr(session: AsyncSession):
    yield session
