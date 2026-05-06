"""SQL validation service using sqlglot."""

from sqlglot import parse_one, exp
from sqlglot.errors import ParseError


class ValidationError(Exception):
    """Custom exception for validation errors."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


# sqlglot dialect names for supported database types
DIALECT_MAP = {
    "postgresql": "postgres",
    "mysql": "mysql",
}


class ValidatorService:
    """Service for validating and enriching SQL queries."""

    @staticmethod
    def validate_and_enrich(
        sql: str,
        default_limit: int = 1000,
        db_type: str = "postgresql"
    ) -> tuple[str, str | None, bool]:
        """Validate and enrich SQL query.

        Args:
            sql: The SQL query to validate
            default_limit: Default LIMIT to inject if missing
            db_type: Database type for dialect-specific parsing

        Returns:
            Tuple of (enriched_sql, error_message, is_truncated)

        Raises:
            ValidationError: If validation fails
        """
        dialect = DIALECT_MAP.get(db_type, "postgres")

        # Guard against empty/whitespace input
        if not sql or not sql.strip():
            raise ValidationError("SQL query cannot be empty")

        # Check for multi-statement injection (detect semicolons)
        stripped = sql.strip()
        if ";" in stripped[:-1]:  # Allow trailing semicolon
            raise ValidationError("Only single SQL queries are supported")

        # Check for incomplete WITH/CTE queries (WITH without main SELECT)
        if stripped.upper().startswith("WITH"):
            paren_count = 0
            last_paren_pos = -1
            for i, char in enumerate(stripped):
                if char == '(':
                    paren_count += 1
                elif char == ')':
                    paren_count -= 1
                    if paren_count == 0:
                        last_paren_pos = i

            if last_paren_pos > 0:
                after_cte = stripped[last_paren_pos + 1:].strip().upper()
                if not after_cte.startswith("SELECT"):
                    raise ValidationError("Incomplete WITH/CTE query: missing main SELECT statement after CTE definition. Example: WITH cte AS (...) SELECT * FROM cte")

        # Remove trailing semicolon if present
        if stripped.endswith(";"):
            sql = sql[:-1].strip()
            stripped = sql.strip()

        try:
            ast = parse_one(stripped, dialect=dialect)
        except ParseError as e:
            error_details = e.errors[0] if e.errors else {}
            line = error_details.get("line", "unknown")
            col = error_details.get("col", "unknown")
            desc = error_details.get("description", str(e))

            clean_desc = desc.replace("Expected ", "").replace(" was expected", "")
            message = f"Syntax error (line {line}, column {col}): {clean_desc}"
            raise ValidationError(message)

        # Check statement type - only SELECT and UNION allowed
        if not isinstance(ast, (exp.Select, exp.Union)):
            raise ValidationError("Only SELECT queries are supported")

        # Check for outer LIMIT and inject if missing
        limit = ast.args.get("limit")
        if limit is None:
            ast.set("limit", exp.Limit(expression=exp.Literal.number(default_limit)))
            is_truncated = True
        else:
            is_truncated = False

        # Generate SQL from modified AST
        enriched_sql = ast.sql(dialect=dialect)

        return enriched_sql, None, is_truncated

    @staticmethod
    def validate_for_nl_generated(sql: str, db_type: str = "postgresql") -> tuple[bool, str | None]:
        """Validate AI-generated SQL before inserting into editor.

        This is a lighter validation used for NL→SQL generated code.
        Returns (is_valid, error_message).
        """
        try:
            _, _, _ = ValidatorService.validate_and_enrich(sql, default_limit=0, db_type=db_type)
            return True, None
        except ValidationError as e:
            return False, e.message
