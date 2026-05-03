"""Natural Language to SQL conversion service using OpenAI SDK."""

from openai import OpenAI, APIError, AuthenticationError, RateLimitError, APITimeoutError, APIConnectionError, InternalServerError
from pydantic import BaseModel, Field
from typing import Optional

from app.config import Settings
from app.models.metadata import TableMetadata
from app.services.validator import ValidatorService


class SQLGenerationResult(BaseModel):
    """Structured output for SQL generation."""

    sql: str = Field(description="Generated PostgreSQL SELECT query")
    explanation: Optional[str] = Field(default=None, description="Brief explanation in Chinese")


class NLToSQLService:
    """Service for converting natural language questions to SQL queries."""

    # Error mappings from OpenAI SDK exceptions to Chinese messages
    ERROR_MESSAGES = {
        AuthenticationError: "OpenAI API 密钥无效",
        RateLimitError: "请求过于频繁，请稍后重试",
        APITimeoutError: "请求超时，请稍后重试",
        APIConnectionError: "无法连接到 OpenAI 服务",
        InternalServerError: "OpenAI 服务暂时不可用",
        APIError: "OpenAI API 调用失败",
    }

    @staticmethod
    def _build_schema_ddl(tables: list[TableMetadata]) -> str:
        """Build DDL-style schema context for OpenAI prompt.

        Args:
            tables: List of table metadata

        Returns:
            DDL string with CREATE TABLE statements
        """
        ddl_lines = []
        for table in tables:
            columns_ddl = []
            for col in table.columns:
                col_def = f"  {col.name} {col.data_type}"
                if not col.is_nullable:
                    col_def += " NOT NULL"
                if col.is_primary_key:
                    col_def += " PRIMARY KEY"
                if col.default_value:
                    col_def += f" DEFAULT {col.default_value}"
                columns_ddl.append(col_def)

            table_ddl = f"CREATE TABLE {table.schema_name}.{table.table_name} (\n"
            table_ddl += ",\n".join(columns_ddl)
            table_ddl += "\n);"
            ddl_lines.append(table_ddl)

        return "\n\n".join(ddl_lines)

    @staticmethod
    def _build_system_prompt(schema_ddl: str) -> str:
        """Build system prompt with schema context.

        Args:
            schema_ddl: DDL string for database schema

        Returns:
            System prompt string
        """
        return f"""你是一个专业的 PostgreSQL SQL 生成助手。根据用户的自然语言问题生成 SELECT 查询语句。

数据库结构如下：
{schema_ddl}

要求：
1. 只生成 SELECT 查询语句
2. 不要添加 LIMIT 子句（系统会自动添加）
3. 使用 PostgreSQL 语法
4. 表名和列名要严格匹配上面的结构
5. 如果问题无法从数据库结构中回答，生成一个最接近的查询并在 explanation 中说明
6. 返回的 SQL 不要包含 Markdown 格式（如 ```sql 标记）
"""

    @staticmethod
    async def generate_sql(
        question: str,
        tables: list[TableMetadata],
        settings: Settings
    ) -> tuple[bool, str, Optional[SQLGenerationResult]]:
        """Generate SQL from natural language question.

        Args:
            question: Natural language question in Chinese
            tables: List of table metadata for context
            settings: Application settings with API configuration

        Returns:
            Tuple of (success, error_message, result)
        """
        # Build schema context
        schema_ddl = NLToSQLService._build_schema_ddl(tables)
        system_prompt = NLToSQLService._build_system_prompt(schema_ddl)

        # Initialize OpenAI client with base_url for custom endpoints
        client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_api_endpoint,
            timeout=30.0,
            max_retries=2
        )

        try:
            response = client.beta.chat.completions.parse(
                model=settings.openai_model,
                temperature=0,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                response_format=SQLGenerationResult
            )

            result = response.choices[0].message.parsed

            # Validate generated SQL
            is_valid, error_msg = ValidatorService.validate_for_nl_generated(result.sql)
            if not is_valid:
                return False, f"生成的 SQL 验证失败: {error_msg}", None

            return True, "", result

        except Exception as e:
            # Map exception to user-friendly Chinese message
            for exc_type, msg in NLToSQLService.ERROR_MESSAGES.items():
                if isinstance(e, exc_type):
                    return False, msg, None
            return False, f"SQL 生成失败: {str(e)}", None
