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

    sql: str = Field(description="Generated SELECT query")
    explanation: Optional[str] = Field(default=None, description="Brief explanation of the generated SQL")


class NLToSQLService:
    """Service for converting natural language questions to SQL queries."""

    # Database-specific system prompts
    SYSTEM_PROMPTS = {
        "postgresql": """You are an expert PostgreSQL SQL generation assistant specializing in:
- Complex queries: CTEs (WITH complete SELECT statements), multi-table JOINs, subqueries
- Date/time operations, window functions, and aggregations
- Translating natural language into precise, executable PostgreSQL SQL

Database schema:
{schema_ddl}

Requirements:
1. Only generate SELECT query statements
2. Do NOT add LIMIT clause (system will auto-add)
3. Use PostgreSQL syntax
4. Table and column names must strictly match the schema above
5. **Pay close attention to column comments** - they contain business context, foreign key relationships (e.g., "refers to candidates table"), and enum value explanations
6. Use relationship hints in comments to construct proper JOINs
7. Think step-by-step before writing SQL:
   - Identify which tables are needed
   - Identify relationships between tables (check column comments for "refers to")
   - Identify WHERE conditions
   - Then write the final query
8. If the question is ambiguous or schema is insufficient:
   - Still generate best-effort SQL
   - Use explanation field to clarify assumptions made
9. **CRITICAL**: Always generate COMPLETE, EXECUTABLE SQL:
   - If using WITH/CTE, MUST include the main SELECT statement after the CTE
   - Example: "WITH cte AS (...) SELECT * FROM cte" - NOT just "WITH cte AS (...)"
   - The SQL must be able to run directly in PostgreSQL
10. Return SQL without Markdown formatting (no ```sql markers)

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

Q: Show application count per position
A: SELECT p.title, COUNT(cpa.candidate_id) as application_count
FROM positions p
LEFT JOIN candidate_position_applications cpa ON p.id = cpa.position_id
GROUP BY p.id, p.title;

Q: List job applications with positions and candidates from the last 3 weeks
A: WITH recent_applications AS (
    SELECT
        cpa.id AS application_id,
        cpa.candidate_id,
        cpa.position_id,
        cpa.applied_date,
        cpa.status AS application_status,
        p.title AS position_title,
        cand.first_name,
        cand.last_name,
        cand.email
    FROM candidate_position_applications cpa
    JOIN candidates cand ON cpa.candidate_id = cand.id
    JOIN positions p ON cpa.position_id = p.id
    WHERE cpa.applied_date >= CURRENT_DATE - INTERVAL '3 weeks'
)
SELECT * FROM recent_applications ORDER BY applied_date DESC;

Now answer the user's question.
""",
        "mysql": """You are an expert MySQL SQL generation assistant specializing in:
- Complex queries: CTEs (WITH complete SELECT statements), multi-table JOINs, subqueries
- Date/time operations, window functions, and aggregations
- Translating natural language into precise, executable MySQL SQL

Database schema:
{schema_ddl}

Requirements:
1. Only generate SELECT query statements
2. Do NOT add LIMIT clause (system will auto-add)
3. Use MySQL syntax:
   - Use CONCAT() for string concatenation (not ||)
   - Use LIKE for pattern matching
   - Use backticks \` for identifiers if needed (table/column names with spaces or keywords)
   - Use DATE() or DATE_FORMAT() for date operations
   - For date arithmetic: DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 1 WEEK)
   - For boolean: use TRUE/FALSE or 1/0
4. **CRITICAL**: ONLY use columns and functions that exist in the schema above:
   - NEVER use STATUS() function - it does not exist in MySQL
   - NEVER assume a column exists - only use columns explicitly listed in the schema
   - If you need a column that doesn't exist, either JOIN to a table that has it, or omit that condition
5. Table and column names must strictly match the schema above (case-sensitive)
6. **Pay close attention to column comments** - they contain business context, foreign key relationships (e.g., "refers to users table"), and enum value explanations
7. Use relationship hints in comments to construct proper JOINs
8. Think step-by-step before writing SQL:
   - Identify which tables are needed
   - Verify each column exists in the schema
   - Identify relationships between tables (check column comments for "refers to")
   - Identify WHERE conditions
   - Then write the final query
9. If the question is ambiguous or schema is insufficient:
   - Still generate best-effort SQL
   - Use explanation field to clarify assumptions made
10. **CRITICAL**: Always generate COMPLETE, EXECUTABLE SQL:
   - If using WITH/CTE, MUST include the main SELECT statement after the CTE
   - Example: "WITH cte AS (...) SELECT * FROM cte" - NOT just "WITH cte AS (...)"
   - The SQL must be able to run directly in MySQL
11. Return SQL without Markdown formatting (no ```sql markers)

Examples:

Q: Show all users
A: SELECT * FROM users;

Q: Show user ID, display name, and email for active users
A: SELECT id, display_name, email FROM users WHERE is_active = 1;

Q: Count tasks per project, ordered by count
A: SELECT p.name, COUNT(t.id) as task_count
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name
ORDER BY task_count DESC;

Q: Show tasks with high priority
A: SELECT id, title, priority, status FROM tasks WHERE priority = 'critical';

Q: Show tasks created after a specific date
A: SELECT * FROM tasks WHERE DATE(created_at) > '2024-01-01';

Q: Show active sprints with project names
A: SELECT s.id, s.name AS sprint_name, s.status AS sprint_status, p.name AS project_name
FROM sprints s
JOIN projects p ON s.project_id = p.id
WHERE s.status = 'active'
ORDER BY s.start_date DESC;

Q: List tasks with project names and assignee names from the last week
A: WITH recent_tasks AS (
    SELECT
        t.id AS task_id,
        t.title AS task_title,
        t.status AS task_status,
        t.priority AS task_priority,
        p.name AS project_name,
        u.display_name AS assignee_name,
        t.created_at
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN users u ON t.assignee_id = u.id
    WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)
)
SELECT * FROM recent_tasks ORDER BY created_at DESC;

Q: List activity logs from the last month
A: SELECT * FROM activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) ORDER BY created_at DESC;

Now answer the user's question.
"""
    }

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
    def _build_system_prompt(schema_ddl: str, db_type: str = "postgresql") -> str:
        """Build system prompt with schema context.

        Args:
            schema_ddl: DDL string for database schema
            db_type: Database type (postgresql or mysql)

        Returns:
            System prompt string
        """
        prompt_template = NLToSQLService.SYSTEM_PROMPTS.get(db_type, NLToSQLService.SYSTEM_PROMPTS["postgresql"])
        return prompt_template.format(schema_ddl=schema_ddl)

    @staticmethod
    async def generate_sql(
        question: str,
        tables: list[TableMetadata],
        settings: Settings,
        db_type: str = "postgresql"
    ) -> tuple[bool, str, Optional[SQLGenerationResult]]:
        """Generate SQL from natural language question.

        Args:
            question: Natural language question in Chinese
            tables: List of table metadata for context
            settings: Application settings with API configuration
            db_type: Database type (postgresql or mysql)

        Returns:
            Tuple of (success, error_message, result)
        """
        logger.info("Generating SQL for question: %s... (db_type: %s)", question[:50], db_type)

        # Build schema context
        schema_ddl = NLToSQLService._build_schema_ddl(tables)
        system_prompt = NLToSQLService._build_system_prompt(schema_ddl, db_type)

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

        except (AuthenticationError, RateLimitError, APITimeoutError,
                APIConnectionError, InternalServerError, APIError) as e:
            msg = NLToSQLService.ERROR_MESSAGES.get(type(e), "OpenAI API call failed")
            logger.error("OpenAI %s: %s", type(e).__name__, e)
            return False, msg, None
        except Exception as e:
            logger.error("Unexpected error during SQL generation: %s", e)
            return False, f"Failed to generate SQL: {e}", None

        # Validate generated SQL
        is_valid, error_msg = ValidatorService.validate_for_nl_generated(result.sql, db_type=db_type)
        if not is_valid:
            logger.warning("Generated SQL validation failed: %s", error_msg)
            logger.warning("Generated SQL content: %s", result.sql)
            return False, f"Generated SQL validation failed: {error_msg}\n\nGenerated SQL:\n{result.sql}", None

        logger.info("Successfully generated SQL: %s...", result.sql[:50])
        return True, "", result
