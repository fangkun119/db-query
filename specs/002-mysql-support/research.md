# Research: MySQL Database Support Implementation

**Date**: 2026-05-05
**Status**: Complete
**Feature**: MySQL Database Support (002-mysql-support)

## Overview

This document consolidates research findings for implementing MySQL database support alongside existing PostgreSQL functionality. All research questions from the implementation plan have been resolved with specific technical decisions.

---

## Research Question 1: MySQL Async Driver Strategy

### Question
pymysql doesn't have native async support. What's the recommended async approach for consistency with existing asyncpg pattern?

### Investigation

| Option | Pros | Cons |
|--------|------|------|
| **aiomysql** | Native async/await, consistent API with asyncpg | Less mature, smaller community |
| **sqlalchemy async + pymysql** | Well-tested pattern, pymysql is mature | Synchronous wrapper, less "pure" async |
| **motor-like wrapper** | Custom control | High maintenance burden |

### Decision

**Selected: aiomysql**

**Rationale**:
- Provides native async/await interface matching asyncpg's usage pattern
- SQLAlchemy 2.0+ has official support for aiomysql
- Code consistency: `create_async_engine("mysql+aiomysql://...")` matches existing `create_async_engine("postgresql+asyncpg://...")`
- Sufficient maturity for demo/prototype phase

**Implementation**:
```python
# Connection URL transformation
mysql_url = "mysql://user:pass@host:3306/db"
async_url = mysql_url.replace("mysql://", "mysql+aiomysql://", 1)
engine = create_async_engine(async_url, poolclass=NullPool)
```

**Dependency Addition**:
```toml
"aiomysql>=0.2.0",
"pymysql>=1.0.0",  # Required by aiomysql
```

---

## Research Question 2: MySQL information_schema Compatibility

### Question
How does MySQL's information_schema differ from PostgreSQL for metadata extraction?

### Investigation

**PostgreSQL metadata query** (current):
```sql
-- Uses pg_catalog tables:
SELECT
    t.table_schema,
    t.table_name,
    t.table_type,
    c.column_name,
    c.data_type,
    c.is_nullable,
    pgd.description as table_comment
FROM information_schema.tables t
LEFT JOIN pg_description pgd ON pgd.objoid = pgc.oid
WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
```

**MySQL equivalents**:
```sql
-- Uses only information_schema (no pg_catalog equivalent)
SELECT
    t.table_schema,
    t.table_name,
    t.table_type,  -- 'BASE TABLE' or 'VIEW'
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position,
    kcu.column_name IS NOT NULL as is_primary_key,
    -- Note: MySQL table comments via TABLE_SCHEMA.TABLE_NAME pattern
    NULL as table_comment  -- Available via SHOW TABLE STATUS, not information_schema
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON ...
LEFT JOIN information_schema.key_column_usage kcu ON ...
WHERE t.table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
```

### Key Differences

| Aspect | PostgreSQL | MySQL |
|--------|-----------|-------|
| System schemas | `pg_catalog`, `information_schema` | `mysql`, `information_schema`, `performance_schema`, `sys` |
| Table types | `BASE TABLE`, `VIEW` | `BASE TABLE`, `VIEW` (same) |
| Primary key detection | Via pg_constraint | Via key_column_usage (similar) |
| Table comments | `pg_description` table | `SHOW TABLE STATUS` (separate query) |
| Column comments | `pg_description` with objsubid | `COLUMN_COMMENT` field in information_schema.columns |

### Decision

**Selected: Separate metadata queries per database type**

**Rationale**:
- Avoid complex UNION queries that would be a "generic abstraction layer" (prohibited by constitution)
- Keep database-specific logic isolated as required
- Performance: each query optimized for its database

**Implementation Strategy**:
```python
class MetadataService:
    EXCLUDED_SCHEMAS = {
        "postgresql": {"pg_catalog", "information_schema"},
        "mysql": {"mysql", "information_schema", "performance_schema", "sys"}
    }

    @staticmethod
    def _get_metadata_query(db_type: str) -> str:
        if db_type == "postgresql":
            return POSTGRES_METADATA_QUERY
        elif db_type == "mysql":
            return MYSQL_METADATA_QUERY
        else:
            raise ValueError(f"Unsupported db_type: {db_type}")
```

**MySQL Query**:
```sql
-- Core metadata query (excludes comments initially)
SELECT
    t.table_schema,
    t.table_name,
    CASE
        WHEN t.table_type = 'BASE TABLE' THEN 'table'
        WHEN t.table_type = 'VIEW' THEN 'view'
        ELSE t.table_type
    END as table_type,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position,
    COALESCE(kcu.column_name IS NOT NULL, false) as is_primary_key
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON ...
LEFT JOIN information_schema.key_column_usage kcu ON ...
WHERE t.table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
ORDER BY t.table_schema, t.table_name, c.ordinal_position
```

**Table Comments**: For MySQL v1.0, table comments can be `NULL` or fetched via separate `SHOW TABLE STATUS` query. Given demo-grade scope, `NULL` comments are acceptable.

---

## Research Question 3: MySQL-Specific SQL Syntax

### Question
What SQL syntax differences exist between PostgreSQL and MySQL that affect NL to SQL generation?

### Investigation

| Syntax Feature | PostgreSQL | MySQL | Impact on NL to SQL |
|----------------|-----------|-------|---------------------|
| **LIMIT clause** | `LIMIT 10` (at end) | `LIMIT 10` (at end) | **Same** - no difference! |
| **String concatenation** | `|| 'text'` | `CONCAT(a, b)` | **High** - common in queries |
| **Current date/time** | `CURRENT_DATE`, `NOW()` | `CURDATE()`, `NOW()` | **Medium** - date filters |
| **Boolean literals** | `TRUE`, `FALSE` | `1`, `0` (or TRUE/FALSE works) | **Low** - MySQL accepts both |
| **Identifier quoting** | `"column"` | `` `column` `` | **Medium** - reserved keywords |
| **ILIKE (case-insensitive)** | `col ILIKE '%text%'` | `col LIKE '%text%'` (binary) | **High** - common pattern |
| **Auto-increment in INSERT** | `DEFAULT` | `0` or omit | **Low** - not in SELECT-only |
| **EXPLAIN** | `EXPLAIN ANALYZE` | `EXPLAIN` | **None** - not in v1 scope |

### Decision

**Selected: Database-specific LLM prompts**

**Rationale**:
- LIMIT syntax is identical (no transformation needed)
- String concatenation and case-insensitive matching are the main differences
- LLM can be instructed via system prompt to use correct syntax per database type
- Avoids post-processing SQL string manipulation

**Implementation Strategy**:
```python
class NLToSQLService:
    SYSTEM_PROMPTS = {
        "postgresql": """Generate PostgreSQL SELECT queries.
- Use || for string concatenation
- Use ILIKE for case-insensitive matching
- Use TRUE/FALSE for boolean literals
- Place LIMIT at end of query
""",
        "mysql": """Generate MySQL SELECT queries.
- Use CONCAT(a, b) for string concatenation
- Use LIKE for case-insensitive matching (MySQL default)
- Use 1/0 or TRUE/FALSE for boolean literals
- Place LIMIT at end of query
- Use backticks for identifiers that are reserved keywords
"""
    }

    @staticmethod
    def _get_system_prompt(db_type: str) -> str:
        return NLToSQLService.SYSTEM_PROMPTS.get(db_type, "")
```

**SQLGenerationResult Model Update**:
```python
class SQLGenerationResult(BaseModel):
    sql: str = Field(description=f"Generated SELECT query for {{database_type}}")
    explanation: Optional[str] = None
```

---

## Research Question 4: URL Scheme Detection

### Question
How to reliably detect and differentiate mysql:// from postgresql:// URLs?

### Investigation

**URL Formats**:
```
PostgreSQL: postgresql://user:pass@host:port/db
PostgreSQL: postgres://user:pass@host:port/db (alternative)
MySQL:      mysql://user:pass@host:port/db
```

**URL Parsing Options**:

| Library | Pros | Cons |
|---------|------|------|
| `urllib.parse` | Built-in, no deps | Manual scheme extraction, no validation |
| `sqlalchemy.engine.url.make_url` | Validates URL format | Heavy dependency for simple task |
| String `startswith()` | Simple, fast | No validation, manual parsing |

### Decision

**Selected: String-based detection with validation**

**Rationale**:
- KISS principle for demo-grade scope
- Fast and predictable
- Connection testing already validates URL format
- Consistent with existing `_validate_url()` pattern in connection.py

**Implementation**:
```python
class ConnectionService:
    @staticmethod
    def _detect_db_type(url: str) -> tuple[str, str]:
        """Detect database type from URL scheme.

        Returns:
            tuple: (db_type, error_message)
        """
        if url.startswith("postgresql://") or url.startswith("postgresql+asyncpg://"):
            return "postgresql", ""
        elif url.startswith("postgres://"):
            return "postgresql", ""
        elif url.startswith("mysql://") or url.startswith("mysql+aiomysql://"):
            return "mysql", ""
        else:
            return "", f"Unsupported database URL scheme. Must start with postgresql:// or mysql://"

    @staticmethod
    def _validate_url(url: str) -> tuple[bool, str]:
        """Validate connection URL format."""
        db_type, error = ConnectionService._detect_db_type(url)
        if not db_type:
            return False, error
        return True, ""
```

**URL Transformation for Connection**:
```python
@staticmethod
def get_connection_url(url: str, db_type: str) -> str:
    """Convert URL to async driver format."""
    if db_type == "postgresql":
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url  # Already has driver
    elif db_type == "mysql":
        if url.startswith("mysql://"):
            return url.replace("mysql://", "mysql+aiomysql://", 1)
        return url  # Already has driver
    raise ValueError(f"Unsupported db_type: {db_type}")
```

---

## Summary of Decisions

| Question | Decision | Key Impact |
|----------|----------|------------|
| MySQL async driver | **aiomysql** | Add aiomysql>=0.2 dependency |
| Metadata queries | **Separate per db_type** | MetadataService._get_metadata_query() |
| SQL syntax differences | **Database-specific LLM prompts** | NLToSQLService.SYSTEM_PROMPTS |
| URL detection | **String startswith()** | ConnectionService._detect_db_type() |

---

## Open Questions Resolved

All research questions from the implementation plan have been resolved. No further blocking questions remain for Phase 1 (Design & Contracts).

---

## Next Steps

Proceed to Phase 1: Design & Contracts
- Generate data-model.md
- Generate contracts/api.md
- Generate quickstart.md
