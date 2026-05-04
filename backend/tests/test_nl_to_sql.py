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

    def test_extract_from_markdown_code_block(self):
        """Test extracting SQL from markdown code block."""
        text = """Here's the SQL query:

```sql
SELECT * FROM users WHERE active = true
```

This query returns active users."""

        sql = NLToSQLService._extract_sql_from_text(text)
        assert sql == "SELECT * FROM users WHERE active = true"

    def test_extract_from_markdown_without_sql_tag(self):
        """Test extracting SQL from markdown without sql tag."""
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
        # The regex captures SELECT statements including semicolon if present
        assert sql == "SELECT id, name FROM products LIMIT 10;"

    def test_extract_uppercase_select(self):
        """Test extracting uppercase SELECT statement."""
        text = "select * from orders"

        sql = NLToSQLService._extract_sql_from_text(text)
        # The implementation uses text.upper().startswith("SELECT")
        # So lowercase "select" should match and return the full text
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
                        ordinal_position=1
                    ),
                    ColumnMetadata(
                        name="name",
                        data_type="varchar",
                        is_nullable=True,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=2
                    ),
                ]
            )
        ]

        ddl = NLToSQLService._build_schema_ddl(tables)

        assert "CREATE TABLE public.users" in ddl
        assert "id integer NOT NULL PRIMARY KEY" in ddl
        assert "name varchar" in ddl
        assert ddl.endswith(";")

    def test_build_ddl_with_comments(self):
        """Test building DDL with comments."""
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
                        ordinal_position=1
                    ),
                ]
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
                        ordinal_position=1
                    ),
                ]
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
                        ordinal_position=1
                    ),
                ]
            ),
        ]

        ddl = NLToSQLService._build_schema_ddl(tables)

        assert "CREATE TABLE public.users" in ddl
        assert "CREATE TABLE public.orders" in ddl

    def test_build_ddl_with_view(self):
        """Test building DDL including view."""
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="user_summary",
                table_type="VIEW",
                columns=[
                    ColumnMetadata(
                        name="user_count",
                        data_type="bigint",
                        is_nullable=False,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=1
                    ),
                ]
            )
        ]

        ddl = NLToSQLService._build_schema_ddl(tables)

        assert "CREATE TABLE public.user_summary" in ddl
        assert "user_count bigint NOT NULL" in ddl


class TestBuildSystemPrompt:
    """Test building system prompt."""

    def test_build_prompt_with_schema(self):
        """Test building prompt with schema context."""
        schema_ddl = "CREATE TABLE public.users (id integer PRIMARY KEY);"

        prompt = NLToSQLService._build_system_prompt(schema_ddl)

        assert "你是一个专业的 PostgreSQL SQL 生成助手" in prompt
        assert schema_ddl in prompt
        assert "只生成 SELECT 查询语句" in prompt
        assert "不要添加 LIMIT 子句" in prompt
        assert "使用 PostgreSQL 语法" in prompt

    def test_prompt_contains_requirements(self):
        """Test that prompt contains all requirements."""
        schema_ddl = "CREATE TABLE test (id integer);"
        prompt = NLToSQLService._build_system_prompt(schema_ddl)

        # Check for key requirements
        assert "SELECT" in prompt
        assert "PostgreSQL" in prompt
        assert "严格匹配" in prompt or "match" in prompt.lower()


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
                        ordinal_position=1
                    ),
                    ColumnMetadata(
                        name="name",
                        data_type="varchar",
                        is_nullable=True,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=2
                    ),
                    ColumnMetadata(
                        name="email",
                        data_type="varchar",
                        is_nullable=False,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=3
                    ),
                ],
                comment="User accounts"
            )
        ]

    @pytest.mark.asyncio
    async def test_generate_sql_success(self, mock_settings, sample_tables):
        """Test successful SQL generation."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.parsed = SQLGenerationResult(
            sql="SELECT id, name FROM public.users WHERE email IS NOT NULL",
            explanation="查询有邮箱的用户"
        )

        with patch("app.services.nl_to_sql.OpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.beta.chat.completions.parse.return_value = mock_response

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
    async def test_generate_sql_validation_failure(self, mock_settings, sample_tables):
        """Test SQL generation with validation failure."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.parsed = SQLGenerationResult(
            sql="DELETE FROM users",  # Invalid: not a SELECT
            explanation=None
        )

        with patch("app.services.nl_to_sql.OpenAI") as mock_openai, \
             patch("app.services.nl_to_sql.ValidatorService") as mock_validator:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.beta.chat.completions.parse.return_value = mock_response
            mock_validator.validate_for_nl_generated.return_value = (False, "Only SELECT queries are supported")

            success, error_msg, result = await NLToSQLService.generate_sql(
                question="删除所有用户",
                tables=sample_tables,
                settings=mock_settings
            )

            assert success is False
            assert "validation failed" in error_msg.lower() or "验证失败" in error_msg
            assert result is None

    @pytest.mark.asyncio
    async def test_generate_sql_fallback_to_text(self, mock_settings, sample_tables):
        """Test fallback to text completion when parse fails."""
        mock_client = MagicMock()

        # First call to parse() raises exception
        mock_client.beta.chat.completions.parse.side_effect = Exception("Parse error")

        # Fallback to text completion
        mock_text_response = MagicMock()
        mock_text_response.choices = [MagicMock()]
        mock_text_response.choices[0].message.content = "SELECT * FROM users"

        mock_client.chat.completions.create.return_value = mock_text_response

        with patch("app.services.nl_to_sql.OpenAI", return_value=mock_client), \
             patch("app.services.nl_to_sql.ValidatorService", return_value=(True, None)) as mock_validator:
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
    async def test_generate_sql_openai_error(self, mock_settings, sample_tables):
        """Test that exceptions from OpenAI are propagated when both methods fail."""
        with patch("app.services.nl_to_sql.OpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client

            # Set up parse to fail with a generic exception
            mock_client.beta.chat.completions.parse.side_effect = Exception("Parse failed")

            # Set up create to also fail
            mock_client.chat.completions.create.side_effect = Exception("API failed")

            # When both fail, the exception should be raised
            with pytest.raises(Exception, match="API failed"):
                await NLToSQLService.generate_sql(
                    question="查询用户",
                    tables=sample_tables,
                    settings=mock_settings
                )

    @pytest.mark.asyncio
    async def test_generate_sql_unable_to_extract(self, mock_settings, sample_tables):
        """Test failure when SQL cannot be extracted from text response."""
        mock_client = MagicMock()

        # Parse fails
        mock_client.beta.chat.completions.parse.side_effect = Exception("Parse error")

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
            assert "无法从响应中提取 SQL" in error_msg or "extract" in error_msg.lower()
            assert result is None

    @pytest.mark.asyncio
    async def test_generate_sql_with_complex_schema(self, mock_settings):
        """Test SQL generation with complex schema."""
        complex_tables = [
            TableMetadata(
                schema_name="public",
                table_name="candidates",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(
                        name="id",
                        data_type="integer",
                        is_nullable=False,
                        is_primary_key=True,
                        default_value=None,
                        ordinal_position=1
                    ),
                    ColumnMetadata(
                        name="position_id",
                        data_type="integer",
                        is_nullable=True,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=2
                    ),
                    ColumnMetadata(
                        name="status",
                        data_type="varchar",
                        is_nullable=True,
                        is_primary_key=False,
                        default_value="'pending'",
                        ordinal_position=3
                    ),
                ],
                comment="Candidate applications"
            ),
            TableMetadata(
                schema_name="public",
                table_name="positions",
                table_type="BASE TABLE",
                columns=[
                    ColumnMetadata(
                        name="id",
                        data_type="integer",
                        is_nullable=False,
                        is_primary_key=True,
                        default_value=None,
                        ordinal_position=1
                    ),
                    ColumnMetadata(
                        name="title",
                        data_type="varchar",
                        is_nullable=False,
                        is_primary_key=False,
                        default_value=None,
                        ordinal_position=2
                    ),
                ],
                comment="Job positions"
            ),
        ]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.parsed = SQLGenerationResult(
            sql="SELECT c.id, p.title FROM candidates c JOIN positions p ON c.position_id = p.id WHERE c.status = 'pending'",
            explanation="查询待处理的候选人及其职位"
        )

        with patch("app.services.nl_to_sql.OpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.beta.chat.completions.parse.return_value = mock_response

            success, error_msg, result = await NLToSQLService.generate_sql(
                question="查询所有待处理的候选人及其职位名称",
                tables=complex_tables,
                settings=mock_settings
            )

            assert success is True
            assert result is not None
            assert "JOIN" in result.sql


class TestErrorMessageMapping:
    """Test error message mapping for different OpenAI errors."""

    def test_authentication_error_message(self):
        """Test error message for authentication failure."""
        assert "密钥" in NLToSQLService.ERROR_MESSAGES[AuthenticationError]

    def test_rate_limit_error_message(self):
        """Test error message for rate limiting."""
        assert "频繁" in NLToSQLService.ERROR_MESSAGES[RateLimitError]

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
