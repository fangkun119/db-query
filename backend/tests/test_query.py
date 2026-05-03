import pytest
from unittest.mock import AsyncMock, patch

from app.services.query import QueryService
from app.models.query import QueryRequest
from app.services.validator import ValidationError


class TestExecuteQueryValidation:
    @pytest.mark.asyncio
    async def test_execute_query_validation_error_non_select(self):
        with patch("app.services.query.ValidatorService.validate_and_enrich") as mock_validate:
            mock_validate.side_effect = ValidationError("Only SELECT queries are supported")

            result, error = await QueryService.execute_query(
                "postgresql://localhost/test",
                QueryRequest(sql="DELETE FROM users"),
                default_limit=1000
            )

            assert result is None
            assert error == "Only SELECT queries are supported"

    @pytest.mark.asyncio
    async def test_execute_query_validation_error_syntax(self):
        with patch("app.services.query.ValidatorService.validate_and_enrich") as mock_validate:
            mock_validate.side_effect = ValidationError("Syntax error (line 1, column 6): SELECT expected")

            result, error = await QueryService.execute_query(
                "postgresql://localhost/test",
                QueryRequest(sql="INVALID SQL"),
                default_limit=1000
            )

            assert result is None
            assert "Syntax error" in error

    @pytest.mark.asyncio
    async def test_execute_query_validation_error_empty(self):
        with patch("app.services.query.ValidatorService.validate_and_enrich") as mock_validate:
            mock_validate.side_effect = ValidationError("SQL query cannot be empty")

            result, error = await QueryService.execute_query(
                "postgresql://localhost/test",
                QueryRequest(sql=""),
                default_limit=1000
            )

            assert result is None
            assert "cannot be empty" in error


class TestExecuteQueryDatabaseErrors:
    @pytest.mark.asyncio
    async def test_execute_query_database_connection_error(self):
        from unittest.mock import MagicMock
        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def mock_async_context_manager():
            class MockConnection:
                async def execute(self, query):
                    raise Exception("Database connection failed")

            yield MockConnection()

        mock_engine = MagicMock()
        mock_engine.connect.return_value = mock_async_context_manager()
        mock_engine.dispose = AsyncMock()

        with patch("app.services.query.create_async_engine", return_value=mock_engine):
            result, error = await QueryService.execute_query(
                "postgresql://localhost/test",
                QueryRequest(sql="SELECT * FROM users"),
                default_limit=1000
            )

            assert result is None
            assert error is not None
            assert "Query execution failed" in error


class TestTruncationDetection:
    @pytest.mark.asyncio
    async def test_truncation_detected_when_no_limit(self):
        """Test that truncation is detected when original SQL has no LIMIT."""
        with patch("app.services.query.ValidatorService.validate_and_enrich") as mock_validate:
            mock_validate.return_value = ("SELECT * FROM users LIMIT 1000", None)

            # The detection happens in QueryService based on original SQL
            from unittest.mock import MagicMock
            from contextlib import asynccontextmanager
            from sqlalchemy.engine import Result

            @asynccontextmanager
            async def mock_async_context_manager():
                class MockConnection:
                    async def execute(self, query):
                        return MagicMock(returns_rows=True, mappings=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))

                yield MockConnection()

            mock_engine = MagicMock()
            mock_engine.connect.return_value = mock_async_context_manager()
            mock_engine.dispose = AsyncMock()

            with patch("app.services.query.create_async_engine", return_value=mock_engine):
                result, error = await QueryService.execute_query(
                    "postgresql://localhost/test",
                    QueryRequest(sql="SELECT * FROM users"),
                    default_limit=1000
                )

                assert error is None
                assert result is not None
                assert result.is_truncated is True

    @pytest.mark.asyncio
    async def test_no_truncation_when_limit_present(self):
        """Test that no truncation flag when original SQL already has LIMIT."""
        with patch("app.services.query.ValidatorService.validate_and_enrich") as mock_validate:
            mock_validate.return_value = ("SELECT * FROM users LIMIT 100", None)

            from unittest.mock import MagicMock
            from contextlib import asynccontextmanager

            @asynccontextmanager
            async def mock_async_context_manager():
                class MockConnection:
                    async def execute(self, query):
                        return MagicMock(returns_rows=True, mappings=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))

                yield MockConnection()

            mock_engine = MagicMock()
            mock_engine.connect.return_value = mock_async_context_manager()
            mock_engine.dispose = AsyncMock()

            with patch("app.services.query.create_async_engine", return_value=mock_engine):
                result, error = await QueryService.execute_query(
                    "postgresql://localhost/test",
                    QueryRequest(sql="SELECT * FROM users LIMIT 100"),
                    default_limit=1000
                )

                assert error is None
                assert result is not None
                assert result.is_truncated is False
