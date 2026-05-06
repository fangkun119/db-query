# MySQL Database Support - Pull Request

## Summary

This PR adds MySQL database support alongside existing PostgreSQL functionality, enabling users to connect to, query, and generate SQL for MySQL databases through the DB Query Tool.

**Constitution Amendment**: Updates project constitution from v1.0.0 to v1.1.0 to include MySQL as a supported database type.

## Changes

### Backend

#### Dependencies
- Added `aiomysql>=0.2` and `pymysql>=1.0` to `backend/pyproject.toml`

#### Database Connection Management
- **File**: `backend/app/services/connection.py`
  - Added `_detect_db_type()` method to identify MySQL vs PostgreSQL from URL scheme
  - Updated `_validate_url()` to accept both `postgresql://` and `mysql://` URLs
  - Updated `add_connection()` to store `db_type` derived from URL
  - Updated `get_connection_url()` to transform `mysql://` to `mysql+aiomysql://` for async connections

#### Metadata Extraction
- **File**: `backend/app/services/metadata.py`
  - Added `EXCLUDED_SCHEMAS` dictionary with MySQL system schemas (`mysql`, `information_schema`, `performance_schema`, `sys`)
  - Created `_get_metadata_query()` method returning database-specific metadata queries
  - Updated `fetch_metadata()` to route to MySQL or PostgreSQL queries based on `db_type`
  - Implemented MySQL `TABLE_COMMENT` and `COLUMN_COMMENT` extraction using `information_schema`

#### Query Execution
- **File**: `backend/app/api/v1/databases.py`
  - Updated query routing to use stored `db_type` for database-specific execution

- **File**: `backend/app/services/query.py`
  - Verified `add_limit_clause()` works with MySQL (LIMIT syntax is identical)
  - Added MySQL error message handling to preserve raw MySQL error format

#### Natural Language to SQL
- **File**: `backend/app/services/nl_to_sql.py`
  - Created `SYSTEM_PROMPTS` dictionary with PostgreSQL and MySQL-specific prompts
  - Updated `_get_system_prompt()` to return database-type-specific prompt
  - Updated `generate_sql()` to pass `db_type` to LLM prompt generation

#### Data Models
- **File**: `backend/app/db/sqlite.py`
  - Added `db_type: String` field to `DatabaseConnection` model

- **File**: `backend/app/models/database.py`
  - Added `db_type` field to `DatabaseSummaryResponse` and `DatabaseDetailResponse`

#### Migration
- **File**: `backend/migrations/add_db_type.sql`
  - Created migration script to add `db_type` column with default value "postgresql"

### Frontend

#### Type Definitions
- **File**: `frontend/src/types/index.ts`
  - Added `DatabaseType = "postgresql" | "mysql"` type
  - Updated `DatabaseSummary` and `DatabaseDetail` interfaces to include `dbType: DatabaseType`

#### Components
- **File**: `frontend/src/components/database/database-list.tsx`
  - Updated to display database type label (PostgreSQL/MySQL) for each connection

- **File**: `frontend/src/components/schema/schema-tree.tsx`
  - Verified table and column comments display in tooltips for both PostgreSQL and MySQL

### Documentation

- **File**: `CLAUDE.md`
  - Added MySQL test database information to "Test Databases" section
  - Updated connection URL examples and query examples for MySQL

- **File**: `test/rest/mysql.rest`
  - Created comprehensive REST Client test file with 54 test cases covering:
    - Health checks
    - Database management (add, list, get, refresh, delete)
    - Basic queries (SELECT, JOIN, aggregates, GROUP BY, ORDER BY)
    - MySQL-specific syntax (CONCAT, LIKE, backtick identifiers, date functions)
    - Error handling (invalid URL, connection failure, SQL syntax errors, DML rejection)
    - Natural language to SQL conversion
    - Mixed database scenarios (PostgreSQL + MySQL coexistence)

- **File**: `.specify/memory/constitution.md`
  - Updated constitution from v1.0.0 to v1.1.0
  - Extended Principle I from "PostgreSQL-First" to "PostgreSQL and MySQL Support"
  - Added MySQL database drivers to Technology Stack Constraints

### Testing

- MySQL test database: `todo_db` (20 tables, 2000+ tasks)
- REST Client test file: `test/rest/mysql.rest` (54 test cases)
- Verified PostgreSQL functionality unchanged (regression testing)
- Tested MySQL-specific syntax (CONCAT, LIKE, backtick identifiers)
- Tested error handling for MySQL connections and queries
- Tested natural language to SQL generation for MySQL

## User Impact

Users can now:
1. Add MySQL database connections via `mysql://` URLs
2. Query MySQL databases with MySQL-specific SQL syntax
3. Generate MySQL-specific SQL from natural language prompts
4. View database type indicators in the database list
5. View table and column comments for MySQL databases

## Backward Compatibility

✅ All existing PostgreSQL functionality remains unchanged
✅ Existing PostgreSQL connections automatically get `db_type="postgresql"` after migration
✅ API contracts extended (not broken) - `dbType` field added to responses
✅ Frontend TypeScript types extended with `DatabaseType` union

## Testing Checklist

- ✅ Backend test suite passes (54 tests)
- ✅ MySQL REST Client tests pass (54 test cases)
- ✅ PostgreSQL REST Client tests pass (no regression)
- ✅ Manual E2E testing completed
- ✅ Error handling verified (invalid URL, connection failure, SQL syntax errors)
- ✅ Database type badge displays correctly
- ✅ Schema tree tooltip displays comments
- ✅ Constitution updated to v1.1.0

## Related Issues

- Feature: 002-mysql-support
- Spec: [specs/002-mysql-support/spec.md](specs/002-mysql-support/spec.md)
- Plan: [specs/002-mysql-support/plan.md](specs/002-mysql-support/plan.md)
- Tasks: [specs/002-mysql-support/tasks.md](specs/002-mysql-support/tasks.md)

## Screenshots

*Note: Screenshots should be added during final review*

1. Database list showing MySQL and PostgreSQL connections with type badges
2. MySQL query results table
3. MySQL database schema with comments in tooltip
4. NL to SQL generating MySQL-specific syntax (CONCAT, backtick identifiers)

## Migration Notes

After deploying this PR:
1. Run database migration: `sqlite3 ~/.db_query/db_query.db < backend/migrations/add_db_type.sql`
2. Restart backend server
3. MySQL connections will use `mysql+aiomysql://` async driver automatically
4. Existing PostgreSQL connections will continue to work with `postgresql+asyncpg://`

## Future Enhancements

Out of scope for this PR:
- Oracle database support
- Microsoft SQL Server support
- Automatic metadata refresh
- Connection pooling for improved performance
- Authenticated database connections (SSL, SSH tunnels)
