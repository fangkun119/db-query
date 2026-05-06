"""Tests for NL to SQL conversion service."""

import pytest
from unittest.mock import patch, MagicMock
from openai import (
    APIError,
    AuthenticationError,
    RateLimitError,
    APITimeoutError,
    APIConnectionError,
    InternalServerError,
)

from app.services.nl_to_sql import NLToSQLService, SQLGenerationResult
from app.models.metadata import TableMetadata, ColumnMetadata
from app.config import Settings


class TestSQLGenerationResult:
    """Test SQL generation result model."""

    def test_create_valid_result(self):
        """Test creating a valid SQL generation result."""
        result = SQLGenerationResult(
            sql="SELECT * FROM users LIMIT 1000",
            explanation="查询所有用户"
        )

        assert result.sql == "SELECT * FROM users LIMIT 1000"
        assert result.explanation == "查询所有用户"

    def test_create_result_without_explanation(self):
        """Test creating result without explanation."""
        result = SQLGenerationResult(
            sql="SELECT id FROM users"
        )

        assert result.sql == "SELECT id FROM users"
        assert result.explanation is None


class TestExtractSQLFromText:
    """Test SQL extraction from LLM responses."""

    def test_extract_from_markdown_code_block_with_sql_tag(self):
        """Test extracting SQL from markdown code block with sql tag."""
        text = """Here's the SQL query:

```sql
SELECT * FROM users WHERE active = true
```

This query returns active users."""

        sql = NLToSQLService._extract_sql_from_text(text)
        assert sql == "SELECT * FROM users WHERE active = true"

    def test_extract_from_markdown_code_block_without_sql_tag(self):
        """Test extracting SQL from markdown code block without sql tag."""
        text = """Query:

```
SELECT name FROM users
```

Done."""

        sql = NLToSQLService._extract_sql_from_text(text)
        assert sql == "SELECT name FROM users"

    def test_extract_select_statement(self):
        """Test extracting SELECT statement from plain text."""
        text = "The query is: SELECT id, name FROM products LIMIT 10;"

        sql = NLToSQLService._extract_sql_from_text(text)
        assert sql == "SELECT id, name FROM products LIMIT 10;"

    def test_extract_uppercase_select(self):
        """Test extracting uppercase SELECT statement."""
        text = "select * from orders"

        sql = NLToSQLService._extract_sql_from_text(text)
        assert sql == "select * from orders"

    def test_return_full_text_if_starts_with_select(self):
        """Test returning full text if it starts with SELECT."""
        text = "SELECT COUNT(*) FROM candidates"

        sql = NLToSQLService._extract_sql_from_text(text)
        assert sql == "SELECT COUNT(*) FROM candidates"

    def test_return_none_for_non_sql_text(self):
        """Test returning None for non-SQL text."""
        text = "Here's a summary of the data: users table has 100 records."

        sql = NLToSQLService._extract_sql_from_text(text)
        assert sql is None

    def test_extract_from_multiline_code_block(self):
        """Test extracting SQL from multiline code block."""
        text = """
```sql
SELECT id, name, email
FROM users
WHERE active = true
ORDER BY name
```
"""
        sql = NLToSQLService._extract_sql_from_text(text)
        assert "SELECT id, name, email" in sql
        assert "FROM users" in sql
        assert "WHERE active = true" in sql

    def test_extract_with_trailing_semicolon(self):
        """Test extracting SQL with trailing semicolon."""
        text = "```SELECT * FROM users;```"

        sql = NLToSQLService._extract_sql_from_text(text)
        assert sql == "SELECT * FROM users;"


class TestBuildSchemaDDL:
    """Test building DDL from schema metadata."""

    def test_build_simple_table_ddl(self):
        """Test building DDL for simple table."""
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(
                        name="id",
                        data_type="integer",
                        is_nullable=False,
                        is_primary_key=True,
                        default_value=None,
                        ordinal_position=1,
                        comment=None
                    ),
                    ColumnMetadata(
                        name="name",
                        data_type="varchar",
                        is_nullable=True,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=2,
                        comment="User name"
                    ),
                ],
                comment=None
            )
        ]

        ddl = NLToSQLService._build_schema_ddl(tables)

        assert "CREATE TABLE public.users" in ddl
        assert "id integer NOT NULL PRIMARY KEY" in ddl
        assert "name varchar" in ddl
        assert "-- User name" in ddl
        assert ddl.endswith(";")

    def test_build_ddl_with_comments(self):
        """Test building DDL with table and column comments."""
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(
                        name="id",
                        data_type="integer",
                        is_nullable=False,
                        is_primary_key=True,
                        default_value=None,
                        ordinal_position=1,
                        comment="User ID"
                    ),
                ],
                comment="User accounts"
            )
        ]

        ddl = NLToSQLService._build_schema_ddl(tables)

        assert "-- User ID" in ddl
        assert "-- User accounts" in ddl

    def test_build_ddl_with_default_values(self):
        """Test building DDL with default values."""
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="products",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(
                        name="price",
                        data_type="numeric",
                        is_nullable=True,
                        is_primary_key=False,
                        default_value="0.00",
                        ordinal_position=1,
                        comment=None
                    ),
                ],
                comment=None
            )
        ]

        ddl = NLToSQLService._build_schema_ddl(tables)

        assert "DEFAULT 0.00" in ddl

    def test_build_multiple_tables_ddl(self):
        """Test building DDL for multiple tables."""
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(
                        name="id",
                        data_type="integer",
                        is_nullable=False,
                        is_primary_key=True,
                        default_value=None,
                        ordinal_position=1,
                        comment=None
                    ),
                ],
                comment=None
            ),
            TableMetadata(
                schema_name="public",
                table_name="orders",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(
                        name="id",
                        data_type="integer",
                        is_nullable=False,
                        is_primary_key=True,
                        default_value=None,
                        ordinal_position=1,
                        comment=None
                    ),
                ],
                comment=None
            ),
        ]

        ddl = NLToSQLService._build_schema_ddl(tables)

        assert "CREATE TABLE public.users" in ddl
        assert "CREATE TABLE public.orders" in ddl
        assert ddl.count("CREATE TABLE") == 2


class TestBuildSystemPrompt:
    """Test building system prompt."""

    def test_build_prompt_with_schema(self):
        """Test building prompt with schema context."""
        schema_ddl = "CREATE TABLE public.users (id integer PRIMARY KEY);"

        prompt = NLToSQLService._build_system_prompt(schema_ddl)

        assert "expert PostgreSQL SQL generation assistant" in prompt
        assert schema_ddl in prompt
        assert "Only generate SELECT" in prompt
        assert "Do NOT add LIMIT" in prompt
        assert "PostgreSQL syntax" in prompt

    def test_prompt_contains_requirements(self):
        """Test that prompt contains all requirements."""
        schema_ddl = "CREATE TABLE test (id integer);"
        prompt = NLToSQLService._build_system_prompt(schema_ddl)

        # Check for key requirements
        assert "SELECT" in prompt
        assert "PostgreSQL" in prompt
        assert "strictly match" in prompt or "match" in prompt.lower()


class TestGenerateSQL:
    """Test SQL generation with mocked OpenAI."""

    @pytest.fixture
    def mock_settings(self):
        """Create mock settings."""
        return Settings(
            openai_api_key="test-key",
            openai_api_endpoint="https://api.openai.com/v1",
            openai_model="gpt-4o"
        )

    @pytest.fixture
    def sample_tables(self):
        """Create sample table metadata."""
        return [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(
                        name="id",
                        data_type="integer",
                        is_nullable=False,
                        is_primary_key=True,
                        default_value=None,
                        ordinal_position=1,
                        comment="User ID"
                    ),
                    ColumnMetadata(
                        name="name",
                        data_type="varchar",
                        is_nullable=True,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=2,
                        comment="User name"
                    ),
                    ColumnMetadata(
                        name="email",
                        data_type="varchar",
                        is_nullable=False,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=3,
                        comment="Email address"
                    ),
                ],
                comment="User accounts"
            )
        ]

    @pytest.mark.asyncio
    async def test_generate_sql_success_with_structured_output(self, mock_settings, sample_tables):
        """Test successful SQL generation with text completion."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "SELECT id, name FROM public.users WHERE email IS NOT NULL"

        with patch("app.services.nl_to_sql.OpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create.return_value = mock_response

            success, error_msg, result = await NLToSQLService.generate_sql(
                question="查找所有有邮箱的用户",
                tables=sample_tables,
                settings=mock_settings
            )

            assert success is True
            assert error_msg == ""
            assert result is not None
            assert "SELECT" in result.sql
            assert "users" in result.sql

    @pytest.mark.asyncio
    async def test_generate_sql_with_fallback_to_text(self, mock_settings, sample_tables):
        """Test SQL generation with text completion."""
        mock_client = MagicMock()

        # Text completion returns SQL
        mock_text_response = MagicMock()
        mock_text_response.choices = [MagicMock()]
        mock_text_response.choices[0].message.content = "SELECT * FROM users"

        mock_client.chat.completions.create.return_value = mock_text_response

        with patch("app.services.nl_to_sql.OpenAI", return_value=mock_client), \
             patch("app.services.nl_to_sql.ValidatorService") as mock_validator:
            mock_validator.validate_for_nl_generated.return_value = (True, None)

            success, error_msg, result = await NLToSQLService.generate_sql(
                question="查询所有用户",
                tables=sample_tables,
                settings=mock_settings
            )

            assert success is True
            assert result is not None
            assert "SELECT" in result.sql

    @pytest.mark.asyncio
    async def test_generate_sql_unable_to_extract_from_text(self, mock_settings, sample_tables):
        """Test failure when SQL cannot be extracted from text response."""
        mock_client = MagicMock()

        # Text completion returns non-SQL text
        mock_text_response = MagicMock()
        mock_text_response.choices = [MagicMock()]
        mock_text_response.choices[0].message.content = "I cannot generate SQL for that query."

        mock_client.chat.completions.create.return_value = mock_text_response

        with patch("app.services.nl_to_sql.OpenAI", return_value=mock_client):
            success, error_msg, result = await NLToSQLService.generate_sql(
                question="invalid query",
                tables=sample_tables,
                settings=mock_settings
            )

            assert success is False
            assert "Could not extract SQL" in error_msg or "extract" in error_msg.lower()
            assert result is None

    @pytest.mark.asyncio
    async def test_generate_sql_validation_failure(self, mock_settings, sample_tables):
        """Test SQL generation with validation failure."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "SELECT * FROM invalid_table"  # Valid SELECT but table doesn't exist

        with patch("app.services.nl_to_sql.OpenAI") as mock_openai, \
             patch("app.services.nl_to_sql.ValidatorService") as mock_validator:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create.return_value = mock_response
            mock_validator.validate_for_nl_generated.return_value = (False, "Table 'invalid_table' does not exist")

            success, error_msg, result = await NLToSQLService.generate_sql(
                question="从不存在的表查询",
                tables=sample_tables,
                settings=mock_settings
            )

            assert success is False
            assert "validation failed" in error_msg.lower()
            assert "Generated SQL:" in error_msg
            assert "SELECT * FROM invalid_table" in error_msg
            assert result is None


class TestErrorMessageMapping:
    """Test error message mapping for different OpenAI errors."""

    def test_authentication_error_message(self):
        """Test error message for authentication failure."""
        assert "invalid" in NLToSQLService.ERROR_MESSAGES[AuthenticationError].lower()

    def test_rate_limit_error_message(self):
        """Test error message for rate limiting."""
        assert "requests" in NLToSQLService.ERROR_MESSAGES[RateLimitError].lower()

    def test_all_error_types_mapped(self):
        """Test that all error types have messages."""
        error_types = [
            AuthenticationError,
            RateLimitError,
            APITimeoutError,
            APIConnectionError,
            InternalServerError,
            APIError,
        ]

        for error_type in error_types:
            assert error_type in NLToSQLService.ERROR_MESSAGES
            assert NLToSQLService.ERROR_MESSAGES[error_type]  # Not empty
