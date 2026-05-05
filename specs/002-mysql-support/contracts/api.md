# API Contract: MySQL Database Support

**Feature**: 002-mysql-support
**Version**: 1.1.0 (Constitution Amendment)
**Date**: 2026-05-05

## Overview

This document specifies the API contract changes required to support MySQL databases. All existing API endpoints remain compatible; new fields are added to responses and behaviors are extended to handle MySQL.

---

## Endpoint: Add Database Connection

### Request

```http
PUT /api/v1/databases/{name}
Content-Type: application/json

{
  "url": "mysql://user:password@host:3306/database"
}
```

**URL Schemes Supported**:
- `postgresql://` or `postgres://` (existing)
- `mysql://` (new)

### Response

```json
{
  "name": "todo_db",
  "dbType": "mysql",
  "status": "active",
  "tableCount": 18,
  "viewCount": 0,
  "createdAt": "2026-05-05T12:00:00Z",
  "lastRefreshedAt": "2026-05-05T12:05:00Z"
}
```

**Changes**:
- `dbType` field added to response (new)
- URL validation now accepts `mysql://` scheme (behavior change)

### Error Responses

**Invalid URL Scheme** (4xx):
```json
{
  "detail": "Invalid database URL scheme. Must start with postgresql:// or mysql://"
}
```

**Connection Failed** (4xx):
```json
{
  "detail": "Failed to connect to database server: [MySQL-specific error message]"
}
```

**Duplicate Name** (409):
```json
{
  "detail": "Connection name 'todo_db' already exists"
}
```

---

## Endpoint: List All Databases

### Request

```http
GET /api/v1/databases
```

### Response

```json
[
  {
    "name": "interview_db",
    "dbType": "postgresql",
    "status": "active",
    "tableCount": 23,
    "viewCount": 2,
    "createdAt": "2026-04-01T10:00:00Z",
    "lastRefreshedAt": "2026-05-01T15:30:00Z"
  },
  {
    "name": "todo_db",
    "dbType": "mysql",
    "status": "active",
    "tableCount": 18,
    "viewCount": 0,
    "createdAt": "2026-05-05T12:00:00Z",
    "lastRefreshedAt": "2026-05-05T12:05:00Z"
  }
]
```

**Changes**: `dbType` field added to each database object (new)

---

## Endpoint: Get Database Details

### Request

```http
GET /api/v1/databases/{name}
```

### Response

```json
{
  "name": "todo_db",
  "dbType": "mysql",
  "status": "active",
  "tableCount": 18,
  "viewCount": 0,
  "tables": [
    {
      "schemaName": "todo_db",
      "tableName": "tasks",
      "tableType": "table",
      "columns": [
        {
          "name": "id",
          "dataType": "INT",
          "isNullable": false,
          "defaultValue": null,
          "isPrimaryKey": true,
          "comment": null
        },
        {
          "name": "title",
          "dataType": "VARCHAR(500)",
          "isNullable": false,
          "defaultValue": null,
          "isPrimaryKey": false,
          "comment": "Task title"
        }
      ],
      "comment": "Task table"
    }
  ],
  "createdAt": "2026-05-05T12:00:00Z",
  "lastRefreshedAt": "2026-05-05T12:05:00Z"
}
```

**Changes**: `dbType` field added (new)

---

## Endpoint: Refresh Metadata

### Request

```http
POST /api/v1/databases/{name}/refresh
```

### Behavior

**PostgreSQL** (existing):
- Queries `pg_catalog` and `information_schema`
- Uses PostgreSQL-specific comment queries (`pg_description`)
- Excludes: `pg_catalog`, `information_schema`

**MySQL** (new):
- Queries `information_schema` only
- No table comments (NULL for demo phase)
- Excludes: `mysql`, `information_schema`, `performance_schema`, `sys`

### Response

Same as `GET /api/v1/databases/{name}` (returns updated metadata)

---

## Endpoint: Execute Query

### Request

```http
POST /api/v1/databases/{name}/query
Content-Type: application/json

{
  "sql": "SELECT * FROM tasks LIMIT 5"
}
```

### Behavior

**Query Routing**:
```python
# Database-type-aware routing
db_type = get_db_type_from_db(name)
if db_type == "postgresql":
    result = execute_postgresql_query(url, sql)
elif db_type == "mysql":
    result = execute_mysql_query(url, sql)
```

**LIMIT Handling**:
- PostgreSQL: `LIMIT 1000` appended if missing
- MySQL: `LIMIT 1000` appended if missing (same syntax)
- Notification: `"仅显示前 1000 行"` for both

**SQL Validation**:
- sqlglot parses SQL for syntax checking
- Only SELECT statements allowed
- Database-specific syntax NOT validated (pass-through to database)
- MySQL errors returned as-is

### Success Response

```json
{
  "columns": ["id", "title", "status", "priority"],
  "rows": [
    [1, "Fix bug", "in_progress", "high"],
    [2, "Add feature", "todo", "medium"],
    [3, "Write tests", "done", "low"]
  ],
  "rowCount": 3,
  "limitApplied": 1000,
  "limitMessage": "仅显示前 1000 行"
}
```

**MySQL-Specific Error Response** (4xx):

```json
{
  "detail": "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'SELCT * FROM tasks' at line 1"
}
```

**Error Message Format**:
- Preserve original MySQL error message
- Do NOT sanitize or reformat
- Return raw error from `aiomysql` exception

---

## Endpoint: Natural Language to SQL

### Request

```http
POST /api/v1/databases/{name}/query/natural
Content-Type: application/json

{
  "prompt": "Show me the top 10 tasks by priority"
}
```

### Behavior

**Database-Type-Aware Generation**:

```python
def get_system_prompt(db_type: str) -> str:
    if db_type == "postgresql":
        return "Generate PostgreSQL SELECT queries. Use || for concatenation, ILIKE for case-insensitive."
    elif db_type == "mysql":
        return "Generate MySQL SELECT queries. Use CONCAT() for concatenation, backticks for reserved keywords."
```

**Prompt Construction**:
```python
system_prompt = get_system_prompt(db_type)
user_prompt = f"""
Tables: {table_metadata}
Question: {prompt}

Generate a {db_type} SELECT query.
"""
```

### Response

```json
{
  "sql": "SELECT * FROM tasks ORDER BY priority DESC LIMIT 10",
  "explanation": "Retrieves top 10 tasks ordered by priority (highest first)"
}
```

**Database-Specific SQL Examples**:

| Natural Language | PostgreSQL SQL | MySQL SQL |
|------------------|----------------|-----------|
| "Users whose name starts with 'A'" | `WHERE name ILIKE 'A%'` | `WHERE name LIKE 'A%'` |
| "Concatenate first and last name" | `first_name || ' ' || last_name` | `CONCAT(first_name, ' ', last_name)` |
| "Current date" | `CURRENT_DATE` | `CURDATE()` |

---

## TypeScript Type Definitions

### Frontend Type Updates

**Before** (PostgreSQL-only):
```typescript
interface Database {
  name: string;
  status: string;
  tableCount: number;
  viewCount: number;
  createdAt: string;
  lastRefreshedAt?: string;
}
```

**After** (Multi-database):
```typescript
type DatabaseType = "postgresql" | "mysql";

interface Database {
  name: string;
  dbType: DatabaseType;
  status: string;
  tableCount: number;
  viewCount: number;
  createdAt: string;
  lastRefreshedAt?: string;
}
```

### UI Components

**Database List Badge**:
```tsx
<Badge
  color={database.dbType === "postgresql" ? "blue" : "orange"}
  variant="outline"
>
  {database.dbType.toUpperCase()}
</Badge>
```

---

## Backward Compatibility

### Contract Versioning

| Version | Changes |
|---------|---------|
| 1.0 | PostgreSQL only |
| 1.1 | Add MySQL support, add dbType field |

**Compatibility Guarantees**:
- v1.0 clients continue to work (dbType field is optional in response)
- v1.0 PostgreSQL connections unaffected
- v1.0 API endpoints unchanged (only extended)

---

## Testing Contracts

### REST Client Test Files

**PostgreSQL** (existing): `test/rest/postgres.rest`
- 32 test cases covering CRUD, queries, errors
- No changes required (MySQL tests go to new file)

**MySQL** (new): `test/rest/mysql.rest`
- 30+ test cases matching postgres.rest structure
- MySQL-specific syntax tests (CONCAT, backtick identifiers, etc.)
- Connection URL variations (port, SSL parameters)

### Test Coverage Requirements

| Category | PostgreSQL | MySQL |
|----------|-----------|-------|
| Connection management | ✅ 32 tests | ✅ 30 tests |
| Metadata extraction | ✅ 8 tests | ✅ 8 tests |
| Query execution | ✅ 12 tests | ✅ 12 tests |
| Error handling | ✅ 12 tests | ✅ 12 tests |
| NL to SQL | ✅ 6 tests | ✅ 6 tests |

---

## OpenAPI Specification Updates

### Schema Updates

```yaml
DatabaseType:
  type: string
  enum: [postgresql, mysql]
  default: postgresql

DatabaseSummary:
  type: object
  properties:
    name:
      type: string
    dbType:
      $ref: '#/components/schemas/DatabaseType'
    status:
      type: string
    tableCount:
      type: integer
    viewCount:
      type: integer
    createdAt:
      type: string
      format: date-time
    lastRefreshedAt:
      type: string
      format: date-time
      nullable: true
```

### Endpoint Documentation Updates

Each endpoint's OpenAPI doc should include:
- Supported database types in description
- dbType field in response schema
- Database-type-specific error examples

---

## Migration Notes

### For Frontend Developers

1. **Type Update**: Add `dbType?: DatabaseType` to Database interface
2. **Optional Display**: Display dbType badge if field present (graceful degradation)
3. **No Breaking Changes**: All existing queries and mutations unchanged

### For Backend Developers

1. **Database Model**: Add `db_type` column with migration
2. **Service Layer**: Add db_type-aware routing in MetadataService, QueryService
3. **NL to SQL**: Update prompts with database-specific syntax instructions

---

## Contract Compliance

### Constitution Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| I. PostgreSQL & MySQL Support | ✅ | Extended via MINOR amendment (1.0.0 → 1.1.0) |
| II. SQL Validation | ✅ | sqlglot validates both dialects |
| III. Schema Context | ✅ | db_type determines metadata source |
| IV. Demo Simplicity | ✅ | No generic abstraction, explicit routing |
| V. Structured API | ✅ | CamelCase JSON, consistent contracts |

### API Standards Compliance

| Standard | Status | Notes |
|----------|--------|-------|
| CamelCase responses | ✅ | dbType field uses camelCase |
| Error messages | ✅ | Raw MySQL errors preserved |
| JSON format | ✅ | Consistent with PostgreSQL |
| RESTful | ✅ | Standard HTTP verbs, status codes |
