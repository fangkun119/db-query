import pytest
from sqlglot.errors import ParseError

from app.services.validator import ValidatorService, ValidationError


class TestValidateAndEnrich:
    def test_valid_select_query(self):
        sql = "SELECT * FROM users"
        enriched, error = ValidatorService.validate_and_enrich(sql, default_limit=1000)

        assert error is None
        assert "LIMIT 1000" in enriched.upper()

    def test_valid_select_with_existing_limit(self):
        sql = "SELECT * FROM users LIMIT 100"
        enriched, error = ValidatorService.validate_and_enrich(sql, default_limit=1000)

        assert error is None
        assert "LIMIT 100" in enriched.upper()
        assert enriched.upper().count("LIMIT") == 1

    def test_empty_sql(self):
        with pytest.raises(ValidationError) as exc_info:
            ValidatorService.validate_and_enrich("", default_limit=1000)

        assert "SQL query cannot be empty" in str(exc_info.value)

    def test_whitespace_only_sql(self):
        with pytest.raises(ValidationError) as exc_info:
            ValidatorService.validate_and_enrich("   \n  ", default_limit=1000)

        assert "SQL query cannot be empty" in str(exc_info.value)

    def test_multi_statement_rejection(self):
        with pytest.raises(ValidationError) as exc_info:
            ValidatorService.validate_and_enrich(
                "SELECT * FROM users; DROP TABLE users;",
                default_limit=1000
            )

        assert "Only single SQL queries are supported" in str(exc_info.value)

    def test_trailing_semicolon_allowed(self):
        sql = "SELECT * FROM users;"
        enriched, error = ValidatorService.validate_and_enrich(sql, default_limit=1000)

        assert error is None
        assert enriched.strip().endswith(";") is False or "LIMIT" in enriched.upper()

    def test_non_select_rejection(self):
        with pytest.raises(ValidationError) as exc_info:
            ValidatorService.validate_and_enrich(
                "DELETE FROM users",
                default_limit=1000
            )

        assert "Only SELECT queries are supported" in str(exc_info.value)

    def test_insert_rejection(self):
        with pytest.raises(ValidationError) as exc_info:
            ValidatorService.validate_and_enrich(
                "INSERT INTO users VALUES (1, 'test')",
                default_limit=1000
            )

        assert "Only SELECT queries are supported" in str(exc_info.value)

    def test_syntax_error(self):
        with pytest.raises(ValidationError) as exc_info:
            ValidatorService.validate_and_enrich(
                "SELEC * FROM users",
                default_limit=1000
            )

        assert "Syntax error" in str(exc_info.value)

    def test_union_allowed(self):
        sql = "SELECT * FROM users UNION SELECT * FROM admins"
        enriched, error = ValidatorService.validate_and_enrich(sql, default_limit=1000)

        assert error is None
        assert "LIMIT 1000" in enriched.upper()

    def test_complex_query(self):
        sql = "SELECT id, name FROM users WHERE active = true ORDER BY name"
        enriched, error = ValidatorService.validate_and_enrich(sql, default_limit=500)

        assert error is None
        assert "LIMIT 500" in enriched.upper()


class TestValidateForNlGenerated:
    def test_valid_sql(self):
        is_valid, error = ValidatorService.validate_for_nl_generated("SELECT * FROM users")

        assert is_valid is True
        assert error is None

    def test_invalid_sql(self):
        is_valid, error = ValidatorService.validate_for_nl_generated("INVALID SQL")

        assert is_valid is False
        assert error is not None

    def test_non_select_sql(self):
        is_valid, error = ValidatorService.validate_for_nl_generated("DELETE FROM users")

        assert is_valid is False
        assert "Only SELECT" in error

    def test_empty_sql(self):
        is_valid, error = ValidatorService.validate_for_nl_generated("")

        assert is_valid is False
        assert "cannot be empty" in error
