"""SQL validation service using sqlglot."""

from sqlglot import parse_one, exp
from sqlglot.errors import ParseError


class ValidationError(Exception):
    """Custom exception for validation errors."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ValidatorService:
    """Service for validating and enriching SQL queries."""

    @staticmethod
    def validate_and_enrich(sql: str, default_limit: int = 1000) -> tuple[str, str | None]:
        """Validate and enrich SQL query.

        Args:
            sql: The SQL query to validate
            default_limit: Default LIMIT to inject if missing

        Returns:
            Tuple of (enriched_sql, error_message)

        Raises:
            ValidationError: If validation fails
        """
        # Guard against empty/whitespace input
        if not sql or not sql.strip():
            raise ValidationError("SQL 查询不能为空")

        # Check for multi-statement injection (detect semicolons)
        stripped = sql.strip()
        if ";" in stripped[:-1]:  # Allow trailing semicolon
            raise ValidationError("仅支持单条 SQL 查询")

        # Remove trailing semicolon if present
        if stripped.endswith(";"):
            sql = sql[:-1].strip()
            stripped = sql.strip()

        try:
            ast = parse_one(stripped, dialect="postgres")
        except ParseError as e:
            # Extract error details from ParseError
            error_details = e.errors[0] if e.errors else {}
            line = error_details.get("line", "unknown")
            col = error_details.get("col", "unknown")
            desc = error_details.get("description", str(e))

            # Clean up error message
            clean_desc = desc.replace("Expected ", "").replace(" was expected", "")
            message = f"语法错误 (行 {line}, 列 {col}): {clean_desc}"
            raise ValidationError(message)

        # Check statement type - only SELECT and UNION allowed
        if not isinstance(ast, (exp.Select, exp.Union)):
            raise ValidationError("仅支持 SELECT 查询")

        # Check for outer LIMIT and inject if missing
        limit = ast.args.get("limit")
        if limit is None:
            ast.set("limit", exp.Limit(expression=exp.Literal.number(default_limit)))
            is_truncated = True
        else:
            is_truncated = False

        # Generate SQL from modified AST
        enriched_sql = ast.sql(dialect="postgres")

        return enriched_sql, None

    @staticmethod
    def validate_for_nl_generated(sql: str) -> tuple[bool, str | None]:
        """Validate AI-generated SQL before inserting into editor.

        This is a lighter validation used for NL→SQL generated code.
        Returns (is_valid, error_message).
        """
        try:
            enriched_sql, _ = ValidatorService.validate_and_enrich(sql, default_limit=0)
            return True, None
        except ValidationError as e:
            return False, e.message
