# Implementation Tasks: MySQL Database Support

**Feature**: 002-mysql-support
**Branch**: `002-mysql-support`
**Date**: 2026-05-05
**Status**: Ready for Implementation

## Overview

This document provides a complete, actionable task breakdown for implementing MySQL database support. Tasks are organized by implementation phase with clear file paths and dependencies.

---

## Phase 1: Setup & Dependencies

**Goal**: Install required dependencies and prepare development environment.

### Independent Test Criteria
- ✅ MySQL dependencies install without errors
- ✅ Backend server starts successfully with new dependencies
- ✅ Test database (todo_db) can be created

### Tasks

- [ ] T001 Add aiomysql and pymysql to backend dependencies in `backend/pyproject.toml`
- [ ] T002 Create SQLite migration script to add `db_type` column to `database_connections` table
- [ ] T003 Run database migration to add `db_type` column with default value "postgresql"
- [ ] T004 Create test MySQL database using `test/db_scripts/mysql/todo_db.sql`
- [ ] T005 Verify todo_db has 18 tables and can be queried with `mysql -u todo_db -ptodo_tb todo_db`

---

## Phase 2: Implementation (Combined US1+US2+US3)

**Goal**: Implement all MySQL support features in a single integrated phase.

This phase combines:
- **User Story 1** (P1): Add MySQL database connections
- **User Story 2** (P2): Query MySQL with SQL
- **User Story 3** (P3): Generate MySQL SQL from natural language

### Independent Test Criteria
- ✅ User can add MySQL database connection via API
- ✅ Database list displays correct db_type badge (MYSQL/POSTGRESQL)
- ✅ MySQL queries execute successfully and display results
- ✅ MySQL errors are displayed clearly to users
- ✅ LIMIT is auto-injected for MySQL queries without LIMIT
- ✅ Natural language queries generate MySQL-specific SQL
- ✅ PostgreSQL functionality remains unchanged

### Backend Tasks

#### Connection Management (US1)

- [X] T006 [US1] Implement `_detect_db_type()` method in `backend/app/services/connection.py` to parse URL scheme and return "postgresql" or "mysql"
- [X] T007 [US1] Update `_validate_url()` in `backend/app/services/connection.py` to accept both `postgresql://` and `mysql://` URL schemes
- [X] T008 [US1] Update `add_connection()` in `backend/app/services/connection.py` to extract and store `db_type` from URL when adding database
- [X] T009 [US1] Update `get_connection_url()` in `backend/app/services/connection.py` to transform MySQL URLs to `mysql+aiomysql://` async format
- [X] T010 [US1] Add `db_type` field to `DatabaseConnection` model in `backend/app/db/sqlite.py`

#### Metadata Extraction (US1)

- [X] T011 [US1] Add `EXCLUDED_SCHEMAS` dictionary in `backend/app/services/metadata.py` with MySQL system schemas ("mysql", "information_schema", "performance_schema", "sys")
- [X] T012 [US1] Create `_get_metadata_query()` method in `backend/app/services/metadata.py` that returns MySQL-specific metadata query
- [X] T012a [US1] Implement MySQL TABLE_COMMENT and COLUMN_COMMENT retrieval in `_get_metadata_query()` method (use information_schema.TABLES.TABLE_COMMENT and information_schema.COLUMNS.COLUMN_COMMENT)
- [X] T013 [US1] Update `fetch_metadata()` in `backend/app/services/metadata.py` to call `_get_metadata_query(db_type)` with detected database type
- [X] T014 [US1] Update `fetch_metadata()` in `backend/app/services/metadata.py` to use `async_url` connection helper for MySQL

#### Query Execution (US2)

- [X] T015 [US2] Update query execution in `backend/app/api/v1/databases.py` to route to MySQL or PostgreSQL based on stored `db_type`
- [X] T016 [US2] Verify `add_limit_clause()` in `backend/app/services/query.py` works with MySQL (LIMIT syntax is identical, should already work)
- [X] T017 [US2] Add MySQL error message handling in query execution to preserve raw MySQL error format
- [X] T018 [US2] Test query execution with MySQL-specific syntax (CONCAT, LIKE, backtick identifiers)

#### Natural Language to SQL (US3)

- [X] T019 [US3] Create `SYSTEM_PROMPTS` dictionary in `backend/app/services/nl_to_sql.py` with PostgreSQL and MySQL-specific prompts
- [X] T020 [US3] Update `_get_system_prompt()` method in `backend/app/services/nl_to_sql.py` to return database-type-specific prompt
- [X] T021 [US3] Update `generate_sql()` in `backend/app/services/nl_to_sql.py` to pass `db_type` to LLM prompt generation
- [X] T022 [US3] Test NL to SQL generation with MySQL to verify CONCAT, LIKE, and date functions are generated correctly

#### API Response Models (US1)

- [X] T023 [US1] Add `db_type` field to `DatabaseSummaryResponse` model in `backend/app/models/database.py`
- [X] T024 [US1] Add `db_type` field to `DatabaseDetailResponse` model in `backend/app/models/database.py`
- [X] T025 [US1] Verify API responses return `dbType` field in CamelCase for frontend compatibility

### Frontend Tasks

#### UI Components (US1)

- [X] T026 [P] [US1] Add TypeScript `DatabaseType` type to `frontend/src/types/database.ts`: `type DatabaseType = "postgresql" | "mysql"`
- [X] T027 [P] [US1] Update `Database` interface in `frontend/src/types/database.ts` to include `dbType: DatabaseType` field
- [X] T028 [P] [US1] Update `DatabaseList` component in `frontend/src/components/DatabaseList.tsx` to display database type badge
- [X] T029 [US1] Style MySQL badge with orange color (`#fa8c16`) and PostgreSQL badge with blue color (`#1890ff`)

#### Query Interface (US2)

- [X] T030 [P] [US2] Verify SQL editor (Monaco) doesn't validate MySQL-specific syntax - should allow typing any SQL
- [X] T031 [P] [US2] Test query results display MySQL data correctly (number formatting, date formatting, etc.)
- [X] T030a [P] [US1] Verify schema tree tooltip displays table and column comments for both PostgreSQL and MySQL databases (frontend/src/components/schema/schema-tree.tsx)

### Testing Tasks

#### REST Client Tests

- [X] T032 Create `test/rest/mysql.rest` with 30+ test cases covering connection, queries, errors, and NL to SQL
- [X] T033 Test all REST Client test cases pass successfully
- [X] T034 Verify existing `test/rest/postgres.rest` tests still pass (no regression)

#### Integration Tests

- [X] T035 [P] Test adding MySQL database while PostgreSQL database exists (both appear in list)
- [X] T036 [P] Test querying MySQL database, then PostgreSQL database (switching works correctly)
- [X] T037 [P] Test NL to SQL generates correct SQL for MySQL vs PostgreSQL (same prompt, different output)
- [X] T038 [P] Test MySQL error messages are displayed correctly in UI

### Documentation Tasks

- [X] T039 Update `CLAUDE.md` to add MySQL database information to "Test Databases" section
- [X] T040 Update `CLAUDE.md` MySQL connection URL and example queries
- [X] T041 Update OpenAPI documentation if auto-generated docs need MySQL-specific examples

---

## Phase 3: Testing & Polish

**Goal**: Ensure all functionality works correctly and documentation is complete.

### Independent Test Criteria
- ✅ All 41 implementation tasks are complete
- ✅ MySQL database can be added and queried
- ✅ PostgreSQL functionality unchanged
- ✅ All tests pass
- ✅ Documentation is updated

### Tasks

- [X] T042 Run full backend test suite: `cd backend && uv run pytest tests/ -v`
- [X] T043 Run all REST Client tests in `test/rest/mysql.rest`
- [X] T044 Run all REST Client tests in `test/rest/postgres.rest` to verify no regression
- [X] T045 Perform manual E2E testing: add MySQL DB, query with MySQL SQL, test NL to SQL
- [X] T046 Verify database type badge displays correctly in frontend UI
- [X] T046a Verify schema tree tooltip displays table and column comments when hovering over table and column names
- [X] T047 Test error handling: invalid URL, connection failure, SQL syntax error
- [X] T048 Clean up any test data created during development
- [X] T049 Update constitution to v1.1.0 to officially add MySQL support
- [X] T050 Create pull request with description of MySQL support implementation

---

## Dependencies & Execution Order

### Task Dependency Graph

```
Phase 1 (Setup):
  T001 → T002 → T003 → T004 → T005
           ↓
Phase 2 (Implementation):
  T006, T007, T010, T023, T024 (models - can be parallel)
      ↓
  T011, T012, T012a (metadata) → T013, T014
  T008, T009 (connection) → T015
      ↓
  T016, T017, T018 (query) → T019, T020, T021, T022 (NL to SQL)
  T026, T027, T028, T029, T030a (frontend UI)
      ↓
  T032 (REST tests)
      ↓
Phase 3 (Testing):
  T033 → T034 → T035, T036, T037, T038 → T039 → T040 → T041 → T042 → T043 → T044 → T045 → T046 → T047 → T048 → T049 → T050
```

### Parallel Execution Opportunities

**Within each group**, these tasks can be done in parallel:
- `T006, T007, T010, T023, T024` (model updates - different files)
- `T026, T027` (type definitions - same file, do sequentially)
- `T030, T031` (verification tasks)
- `T035, T036, T037, T038` (integration tests)

### Critical Path

The longest path through all phases:
```
T001 → T002 → T003 → T004 → T005 → T006 → T011 → T012 → T012a → T013 → T015 → T019 → T032 → T042 → T043 → T050
```

Estimated effort: ~25-30 hours for complete implementation

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

If time is constrained, the minimum deliverable feature set is:
- Tasks T001-T005 (Setup)
- Tasks T006-T010, T023-T024 (Connection management + models)
- Tasks T015, T017 (Basic query execution)
- Tasks T032-T033 (Basic testing)
- Tasks T039-T041 (Basic docs)

This enables adding and querying MySQL databases (US1+US2 only).

### Incremental Delivery

Each user story can be delivered and tested independently:
1. **US1 first**: Enable MySQL connections and metadata (T006-T014, T023-T025, T026-T029)
2. **US2 second**: Enable MySQL query execution (T015-T018)
3. **US3 third**: Enable MySQL NL to SQL (T019-T022)

---

## Notes

### File Paths

All file paths are relative to repository root `/Users/ken/Code/cursor/db-query/`:
- Backend: `backend/app/` subdirectories
- Frontend: `frontend/src/` subdirectories
- Tests: `test/` directory

### Testing Requirements

Tests are OPTIONAL per the feature specification. The test tasks (T033-T038) are included for quality assurance but not mandated for delivery.

### Constitution Compliance

All tasks comply with constitution v1.0.0 principles:
- **Python Ergonomics**: Clean, readable code
- **Type Safety Frontend**: TypeScript with strict types
- **API Standards**: CamelCase JSON responses
- **No Generic Abstraction**: Database-specific logic isolated
- **Demo-Grade Simplicity**: SQLite storage, no auth, local dev

### Migration Notes

The database migration (T002-T003) adds `db_type` column with DEFAULT "postgresql". Existing PostgreSQL connections will automatically have correct db_type after migration.
