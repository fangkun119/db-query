# Data Model: Database Query Tool

**Date**: 2026-04-27 | **Branch**: `001-db-query-tool`

## Entities

### DatabaseConnection (Local SQLite)

Stored in `~/.db_query/db_query.db`. Represents a user-added database connection.

| Field | Type | Constraints | Description |
|---|---|---|---|
| name | `str` | PK, unique, max 100 chars | User-provided connection name |
| url | `str` | NOT NULL | Database connection URL (plain text for demo) |
| db_type | `str` | NOT NULL, default "postgresql" | Database type identifier |
| metadata_json | `str` (JSON) | nullable | Cached schema metadata as JSON string |
| status | `str` | default "active" | Connection status: active, error |
| created_at | `datetime` | NOT NULL, default now | Creation timestamp |
| last_refreshed_at | `datetime` | nullable | Last metadata refresh timestamp |

**SQLite DDL**:
```sql
CREATE TABLE database_connections (
    name TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    db_type TEXT NOT NULL DEFAULT 'postgresql',
    metadata_json TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at TIMESTAMP
);
```

### TableMetadata (Transient — parsed from JSON)

Parsed from `metadata_json`. Represents a database table or view.

| Field | Type | Description |
|---|---|---|
| schema_name | `str` | Schema name (e.g., "public") |
| table_name | `str` | Table or view name |
| table_type | `str` | "BASE TABLE" or "VIEW" |
| columns | `list[ColumnMetadata]` | Column definitions |

### ColumnMetadata (Transient — parsed from JSON)

| Field | Type | Description |
|---|---|---|
| name | `str` | Column name |
| data_type | `str` | PostgreSQL data type name |
| is_nullable | `bool` | Whether column allows NULL |
| default_value | `str | None` | Default value expression |
| ordinal_position | `int` | Column order in table |

### QueryRequest (Request body)

| Field | Type | Constraints | Description |
|---|---|---|---|
| sql | `str` | NOT NULL | SQL query string |

### NaturalQueryRequest (Request body)

| Field | Type | Constraints | Description |
|---|---|---|---|
| prompt | `str` | NOT NULL | Natural language question in Chinese |

### QueryResultResponse (API response)

| Field | Type | API Alias (CamelCase) | Description |
|---|---|---|---|
| column_names | `list[str]` | `columnNames` | Column names from query |
| row_data | `list[dict[str, Any]]` | `rowData` | Query result rows |
| total_count | `int` | `totalCount` | Number of rows returned |
| is_truncated | `bool` | `isTruncated` | Whether LIMIT was auto-applied |
| execution_time_ms | `float` | `executionTimeMs` | Query execution time |

### DatabaseSummaryResponse (API response)

| Field | Type | API Alias (CamelCase) | Description |
|---|---|---|---|
| name | `str` | `name` | Connection name |
| db_type | `str` | `dbType` | Database type |
| status | `str` | `status` | Connection status |
| table_count | `int` | `tableCount` | Number of tables |
| view_count | `int` | `viewCount` | Number of views |
| created_at | `datetime` | `createdAt` | Creation timestamp |
| last_refreshed_at | `datetime | None` | `lastRefreshedAt` | Last refresh timestamp |

### DatabaseDetailResponse (API response)

| Field | Type | API Alias (CamelCase) | Description |
|---|---|---|---|
| name | `str` | `name` | Connection name |
| db_type | `str` | `dbType` | Database type |
| status | `str` | `status` | Connection status |
| tables | `list[TableMetadataResponse]` | `tables` | Tables with column info |
| created_at | `datetime` | `createdAt` | Creation timestamp |
| last_refreshed_at | `datetime | None` | `lastRefreshedAt` | Last refresh timestamp |

### TableMetadataResponse (nested in DatabaseDetailResponse)

| Field | Type | API Alias (CamelCase) | Description |
|---|---|---|---|
| schema_name | `str` | `schemaName` | Schema name |
| table_name | `str` | `tableName` | Table/view name |
| table_type | `str` | `tableType` | "BASE TABLE" or "VIEW" |
| columns | `list[ColumnMetadataResponse]` | `columns` | Column definitions |

### ColumnMetadataResponse (nested in TableMetadataResponse)

| Field | Type | API Alias (CamelCase) | Description |
|---|---|---|---|
| name | `str` | `name` | Column name |
| data_type | `str` | `dataType` | Data type name |
| is_nullable | `bool` | `isNullable` | Allows NULL |
| default_value | `str | None` | `defaultValue` | Default value |

### NLQueryResponse (API response)

| Field | Type | API Alias (CamelCase) | Description |
|---|---|---|---|
| sql | `str` | `sql` | Generated SQL query |
| explanation | `str | None` | `explanation` | Brief explanation in Chinese |

## Validation Rules

1. **Connection URL**: Must start with `postgresql://` or `postgresql+asyncpg://` — reject unsupported types
2. **SQL queries**: Must pass sqlglot parsing, must be SELECT or UNION only
3. **LIMIT**: Auto-inject default LIMIT (1000, configurable) if outer query has no LIMIT
4. **NL prompt**: Must be non-empty string

## State Transitions

```
DatabaseConnection:
  [new] → (add URL) → active → (metadata fetch success) → active (with metadata)
                                → (metadata fetch failure) → error
  active/error → (delete) → [removed]
  active → (refresh) → active (updated metadata)
  active → (connection test failure on use) → error
```
