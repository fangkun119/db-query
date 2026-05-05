"""Natural Language to SQL conversion service using OpenAI SDK."""

import re
import logging
from openai import OpenAI, APIError, AuthenticationError, RateLimitError, APITimeoutError, APIConnectionError, InternalServerError
from pydantic import BaseModel, Field
from typing import Optional

from app.config import Settings
from app.models.metadata import TableMetadata
from app.services.validator import ValidatorService

logger = logging.getLogger(__name__)


class SQLGenerationResult(BaseModel):
    """Structured output for SQL generation."""

    sql: str = Field(description="Generated PostgreSQL SELECT query")
    explanation: Optional[str] = Field(default=None, description="Brief explanation of the generated SQL")


class NLToSQLService:
    """Service for converting natural language questions to SQL queries."""

    # Error mappings from OpenAI SDK exceptions to user messages
    ERROR_MESSAGES = {
        AuthenticationError: "OpenAI API key is invalid",
        RateLimitError: "Too many requests. Please try again later.",
        APITimeoutError: "Request timed out. Please try again later.",
        APIConnectionError: "Failed to connect to OpenAI service",
        InternalServerError: "OpenAI service is temporarily unavailable",
        APIError: "OpenAI API call failed",
    }

    @staticmethod
    def _extract_sql_from_text(text: str) -> Optional[str]:
        """Extract SQL from plain text response.

        Args:
            text: Response text from LLM

        Returns:
            Extracted SQL or None
        """
        # Try to find SQL in markdown code blocks
        sql_pattern = r"```(?:sql)?\s*\n?(.*?)```"
        matches = re.findall(sql_pattern, text, re.DOTALL | re.IGNORECASE)
        if matches:
            return matches[0].strip()

        # Try to find SELECT statements (match until semicolon or end)
        # Use [^;]+ to match everything except semicolon, then optionally match semicolon
        select_pattern = r"(SELECT[^;]+;?)\s*$"
        matches = re.findall(select_pattern, text, re.IGNORECASE | re.MULTILINE)
        if matches:
            # Return the longest match (in case there are multiple SELECT statements)
            return max(matches, key=len).strip()

        # Return full text if it looks like SQL
        text = text.strip()
        if text.upper().startswith("SELECT"):
            return text

        return None

    @staticmethod
    def _extract_enum_values(comment: Optional[str]) -> Optional[str]:
        """Extract enum values from column comment.

        Args:
            comment: Column comment that may contain enum values

        Returns:
            Extracted enum values or None
        """
        if not comment:
            return None
        # Match patterns like: "如：applied, screening, interviewing" or "values: applied, screening"
        match = re.search(r'(?:如：|values?:)\s*([a-zA-Z_,\s]+)', comment)
        if match:
            return match.group(1).strip()
        return None

    @staticmethod
    def _build_schema_ddl(tables: list[TableMetadata]) -> str:
        """Build DDL-style schema context for OpenAI prompt.

        Args:
            tables: List of table metadata

        Returns:
            DDL string with CREATE TABLE statements and comments
        """
        ddl_lines = []
        enum_values = {}
        relationships = []

        # Build table DDLs
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

                # Add comment after column definition (comma added during join)
                if col.comment:
                    col_def += f" -- {col.comment}"

                    # Extract enum values if present
                    enum_vals = NLToSQLService._extract_enum_values(col.comment)
                    if enum_vals:
                        enum_values[f"{table.table_name}.{col.name}"] = enum_vals

                    # Collect foreign key relationships
                    if "关联" in col.comment or "refers to" in col.comment.lower():
                        relationships.append(f"-- {table.schema_name}.{table.table_name}.{col.name} → {col.comment}")

                columns_ddl.append(col_def)

            table_ddl = f"CREATE TABLE {table.schema_name}.{table.table_name} (\n"
            table_ddl += ",\n".join(columns_ddl)
            table_ddl += "\n);"
            if table.comment:
                table_ddl += f" -- {table.comment}"
            ddl_lines.append(table_ddl)

        # Add empty line between tables
        result = "\n\n".join(ddl_lines)

        # Add foreign key relationships summary
        if relationships:
            result += "\n\n-- Foreign Key Relationships:\n"
            result += "\n".join(relationships)

        # Add enum values summary
        if enum_values:
            result += "\n\n-- Enum Values:\n"
            for col_path, values in enum_values.items():
                result += f"-- {col_path}: {values}\n"

        return result

    @staticmethod
    def _build_system_prompt(schema_ddl: str) -> str:
        """Build system prompt with schema context.

        Args:
            schema_ddl: DDL string for database schema

        Returns:
            System prompt string
        """
        return f"""You are a professional PostgreSQL SQL generation assistant. Generate SELECT queries based on user's natural language questions.

Database schema:
{schema_ddl}

Requirements:
1. Only generate SELECT query statements
2. Do NOT add LIMIT clause (system will auto-add)
3. Use PostgreSQL syntax
4. Table and column names must strictly match the schema above
5. **Pay close attention to column comments** - they contain:
   - Business context (e.g., "工作年限" = years of experience)
   - Foreign key relationships (e.g., "关联candidates表" means refers to candidates table)
   - Enum value explanations (e.g., "applied, screening, interviewing, offered, hired")
6. Use relationship hints in comments to construct proper JOINs
7. Think step-by-step before writing SQL:
   - Identify which tables are needed
   - Identify relationships between tables (check column comments for "关联" or "refers to")
   - Identify WHERE conditions
   - Then write the final query
8. If the question is ambiguous or schema is insufficient:
   - Still generate best-effort SQL
   - Use explanation field to clarify assumptions made (e.g., "Assuming 'senior' refers to position title")
9. Return SQL without Markdown formatting (no ```sql markers)

Examples:

Q: Show all candidates
A: SELECT * FROM candidates;

Q: Show candidates who applied for positions with "Senior" in the title
A: SELECT DISTINCT c.* FROM candidates c
JOIN candidate_position_applications cpa ON c.id = cpa.candidate_id
JOIN positions p ON cpa.position_id = p.id
WHERE p.title LIKE '%Senior%';

Q: Count applications per position, ordered by count
A: SELECT p.title, COUNT(cpa.candidate_id) as application_count
FROM positions p
LEFT JOIN candidate_position_applications cpa ON p.id = cpa.position_id
GROUP BY p.id, p.title
ORDER BY application_count DESC;

Q: Show candidates with more than 5 years of experience
A: SELECT * FROM candidates WHERE years_of_experience > 5;

Q: 显示每个职位的应聘人数
A: SELECT p.title, COUNT(cpa.candidate_id) as application_count
FROM positions p
LEFT JOIN candidate_position_applications cpa ON p.id = cpa.position_id
GROUP BY p.id, p.title;

Now answer the user's question.
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
        logger.info(f"Generating SQL for question: {question[:50]}...")

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

        # Use text completion mode (more reliable for SQL generation)
        try:
            response = client.chat.completions.create(
                model=settings.openai_model,
                temperature=0,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ]
            )

            content = response.choices[0].message.content.strip()

            # Extract SQL from response
            sql = NLToSQLService._extract_sql_from_text(content)
            if not sql:
                logger.warning("Could not extract SQL from response")
                return False, "Could not extract SQL from response. Please try again or use SQL mode", None

            result = SQLGenerationResult(sql=sql, explanation=None)

        except AuthenticationError as e:
            logger.error(f"OpenAI authentication error: {str(e)}")
            return False, NLToSQLService.ERROR_MESSAGES[AuthenticationError], None
        except RateLimitError as e:
            logger.error(f"OpenAI rate limit error: {str(e)}")
            return False, NLToSQLService.ERROR_MESSAGES[RateLimitError], None
        except APITimeoutError as e:
            logger.error(f"OpenAI timeout error: {str(e)}")
            return False, NLToSQLService.ERROR_MESSAGES[APITimeoutError], None
        except APIConnectionError as e:
            logger.error(f"OpenAI connection error: {str(e)}")
            return False, NLToSQLService.ERROR_MESSAGES[APIConnectionError], None
        except InternalServerError as e:
            logger.error(f"OpenAI internal server error: {str(e)}")
            return False, NLToSQLService.ERROR_MESSAGES[InternalServerError], None
        except APIError as e:
            logger.error(f"OpenAI API error: {str(e)}")
            return False, NLToSQLService.ERROR_MESSAGES[APIError], None
        except Exception as e:
            logger.error(f"Unexpected error during SQL generation: {str(e)}")
            return False, f"Failed to generate SQL: {str(e)}", None

        # Validate generated SQL
        is_valid, error_msg = ValidatorService.validate_for_nl_generated(result.sql)
        if not is_valid:
            logger.warning(f"Generated SQL validation failed: {error_msg}")
            return False, f"Generated SQL validation failed: {error_msg}", None

        logger.info(f"Successfully generated SQL: {result.sql[:50]}...")
        return True, "", result
