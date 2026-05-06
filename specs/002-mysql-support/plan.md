# Implementation Plan: MySQL Database Support

**Branch**: `002-mysql-support` | **Date**: 2026-05-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-mysql-support/spec.md`

## Summary

Add MySQL database support alongside existing PostgreSQL functionality. The system will support both database types for connection management, metadata extraction, SQL query execution, and natural language to SQL conversion. Key technical decisions: use `pymysql` for MySQL connectivity, extend existing PostgreSQL-specific code paths with database-type-aware routing, and maintain backward compatibility with all existing PostgreSQL functionality.

## Technical Context

**Language/Version**: Python 3.14+ (backend), TypeScript (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy (async), asyncpg (PostgreSQL), pymysql (MySQL - new), sqlglot, OpenAI SDK, React, refine 5, Ant Design
**Storage**: SQLite local file (~/.db_query/db_query.db) for connection configs and metadata
**Testing**: pytest (backend), Vitest (unit), Playwright (E2E)
**Target Platform**: Local development server (macOS/Linux/Windows)
**Project Type**: Web service (backend API + React frontend)
**Performance Goals**: Add MySQL connection <10s, query execution <3s for 100 rows, metadata extraction <30s
**Constraints**: NullPool pattern (transient connections), plaintext password storage, manual metadata refresh only
**Scale/Scope**: Support unlimited connection configurations, 2 database types (PostgreSQL, MySQL)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Current Constitution (v1.0.0) Analysis

**Principle I - PostgreSQL-First Database Support** states:
- "PostgreSQL is the primary supported database type for version 1.0"
- "Architecture MUST include extension points for additional database types (MySQL, etc.)"
- "No generic database abstraction layer in initial version"
- "Database-specific logic MUST be isolated for future extraction"

**Gate Status**: ⚠️ **MINOR AMENDMENT REQUIRED**

This feature requires extending beyond the original "PostgreSQL-First" principle to support MySQL in version 1.0. However, the original constitution anticipated this evolution with "extension points for additional database types."

**Constitution Amendment Required**:

```yaml
Version: 1.1.0 (MINOR)
Rationale: Add MySQL as second supported database type alongside PostgreSQL
Changes:
  - Extend Principle I to "PostgreSQL and MySQL Support"
  - Maintain database-specific logic isolation (no generic abstraction layer)
  - Add pymysql as approved dependency
  - All other principles remain unchanged
```

**Justification**: The architecture already isolates database-specific logic (connection.py, metadata.py), making this addition evolutionary rather than revolutionary. The "no generic abstraction layer" principle is maintained - we're adding a second code path, not abstracting.

**Compliance Verification**:
- ✅ Security: Plaintext passwords acceptable for demo phase
- ✅ Correctness: SQL validation via sqlglot remains
- ✅ Performance: NullPool pattern preserves transient connection model
- ✅ Code Style: Database-type-aware routing maintains readability

## Project Structure

### Documentation (this feature)

```text
specs/002-mysql-support/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.md           # API contract changes
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/app/
├── models/
│   ├── database.py          # DatabaseConnection model (update: add db_type field)
│   ├── metadata.py          # TableMetadata, ColumnMetadata (no change needed)
│   └── query.py             # Query request/response models (no change needed)
├── db/
│   └── sqlite.py             # SQLite storage (no change needed)
├── services/
│   ├── connection.py         # Connection management (update: MySQL URL validation)
│   ├── metadata.py           # Metadata extraction (update: MySQL queries)
│   ├── query.py              # Query execution (update: MySQL LIMIT syntax)
│   ├── nl_to_sql.py          # NL to SQL generation (update: MySQL syntax)
│   └── validator.py          # SQL validation (no change needed)
├── api/v1/
│   └── databases.py          # API endpoints (no change needed)
└── config.py                  # Settings (update: add MySQL-related env vars)

frontend/src/
├── components/
│   └── DatabaseList.tsx       # Database list UI (update: show db_type badge)
├── services/
│   └── api.ts                 # API client (no change needed)
└── types/
    └── database.ts            # TypeScript types (update: add db_type)

test/
└── rest/
    ├── postgres.rest           # Existing PostgreSQL tests (update if needed)
    └── mysql.rest              # New: MySQL test cases
```

**Structure Decision**: Web application structure (backend + frontend) is appropriate. The backend follows a layered architecture with models, services, and API layers. The database-specific logic is already isolated in separate service files, making MySQL support additive.

## Complexity Tracking

> **No violations requiring justification**
>
> The constitution amendment (1.0.0 → 1.1.0) is a MINOR version change that adds MySQL support while maintaining all existing principles. No complexity beyond the demo-grade scope is introduced.

## Phase 0: Research & Technical Decisions

### Research Questions

1. **MySQL Async Driver Strategy**
   - **Question**: pymysql doesn't have native async support. What's the recommended async approach?
   - **Options**:
     - aiomysql (async MySQL driver)
     - sqlalchemy's asyncio with pymysql (synchronous wrapper)
     - motor-like async wrapper around pymysql
   - **Decision needed**: Which approach maintains code consistency with existing asyncpg pattern?

2. **MySQL information_schema Compatibility**
   - **Question**: How does MySQL's information_schema differ from PostgreSQL for metadata extraction?
   - **Research needed**:
     - MySQL table_type values (BASE TABLE vs VIEW)
     - MySQL comment storage: information_schema.TABLES.TABLE_COMMENT and information_schema.COLUMNS.COLUMN_COMMENT (vs PostgreSQL's pg_description)
     - MySQL primary key detection via information_schema
     - Any MySQL 5.7 vs 8.0 differences

   - **Decision**: Use `TABLE_COMMENT` and `COLUMN_COMMENT` for MySQL metadata extraction; frontend tooltip display already implemented with Ant Design Tooltip component
3. **MySQL-Specific SQL Syntax**
   - **Question**: What SQL syntax differences exist between PostgreSQL and MySQL that affect NL to SQL generation?
   - **Research needed**:
     - LIMIT clause position and syntax
     - String concatenation (|| vs CONCAT)
     - Date functions (NOW(), CURRENT_DATE vs PostgreSQL equivalents)
     - Identifier quoting (backtick vs double quote)
     - Boolean literals (TRUE/FALSE vs 1/0)

4. **URL Scheme Detection**
   - **Question**: How to reliably detect and differentiate mysql:// from postgresql:// URLs?
   - **Research needed**:
     - URL parsing library choice (urllib.parse vs sqlalchemy URL utilities)
     - Support for postgres:// (alternative scheme)
     - MySQL URL format variations (port, SSL params)

### Deliverable: research.md

Document all decisions with rationale for each research question. This becomes the source of truth for implementation decisions.

## Phase 1: Design & Contracts

### Data Model Updates (data-model.md)

**Existing Model** (DatabaseConnection in sqlite.py):
```python
class DatabaseConnection(Base):
    id: Integer (primary key)
    name: String (unique)
    url: String
    created_at: DateTime
    last_refreshed_at: DateTime (nullable)
```

**Required Changes**:
- Add `db_type: String` field (values: "postgresql", "mysql")
- Store db_type derived from URL scheme on creation
- Use db_type for metadata query routing

**No changes needed** for:
- TableMetadata, ColumnMetadata (already database-agnostic)
- Query request/response models (SQL is passed-through)

### API Contract Changes (contracts/api.md)

**Existing Endpoints** (no signature changes):

1. `PUT /api/v1/databases/{name}` - CreateConnectionRequest (url: string)
   - **Behavior change**: Accept both postgresql:// and mysql:// URLs
   - **Response change**: DatabaseSummaryResponse includes db_type field

2. `GET /api/v1/databases/{name}` - DatabaseDetailResponse
   - **Response change**: Include db_type field

3. `POST /api/v1/databases/{name}/query` - QueryRequest (sql: string)
   - **Behavior change**: Route to MySQL or PostgreSQL based on db_type
   - **Error handling**: Return MySQL-specific error messages

4. `POST /api/v1/databases/{name}/refresh` - (no change)

**New Response Fields**:
```typescript
interface DatabaseSummaryResponse {
  name: string;
  dbType: string;        // NEW: "postgresql" | "mysql"
  tableCount: number;
  viewCount: number;
  createdAt: string;
  lastRefreshedAt?: string;
}

interface DatabaseDetailResponse extends DatabaseSummaryResponse {
  tables: TableMetadataResponse[];
  // ... existing fields
}
```

### Quickstart Guide (quickstart.md)

**MySQL Setup**:
```bash
# Install MySQL dependencies
cd backend && uv sync --extra pymysql

# Create test database
mysql -u root -p < test/db_scripts/mysql/todo_db.sql

# Add MySQL connection via API
PUT http://localhost:8000/api/v1/databases/todo_db
{
  "url": "mysql://todo_db:todo_tb@localhost:3306/todo_db"
}

# Query MySQL database
POST http://localhost:8000/api/v1/databases/todo_db/query
{
  "sql": "SELECT * FROM tasks LIMIT 5"
}
```

**Development Workflow**:
1. Start backend: `make backend-dev`
2. Add MySQL database connection
3. Verify metadata extraction
4. Test SQL queries (MySQL-specific syntax)
5. Test NL to SQL generation

### Dependencies (pyproject.toml)

**Add to dependencies**:
```toml
dependencies = [
    # ... existing
    "pymysql>=1.0",           # NEW: MySQL driver
    "aiomysql>=0.2",          # NEW: Async MySQL driver
]
```

**Rationale**: aiomysql provides async/await interface consistent with asyncpg pattern used elsewhere in the codebase.

## Phase 2: Task Breakdown (Deferred to /speckit.tasks)

The following task breakdown will be generated by `/speckit.tasks`:

### Backend Tasks

1. Add pymysql/aiomysql dependencies
2. Update DatabaseConnection model with db_type field
3. Implement MySQL URL validation in connection.py
4. Implement MySQL metadata extraction queries in metadata.py
5. Update query.py to handle MySQL LIMIT syntax
6. Update nl_to_sql.py to generate MySQL-specific SQL
7. Add MySQL error message handling
8. Update API response models to include db_type

### Frontend Tasks

9. Update DatabaseList component to display db_type badge
10. Update TypeScript types for db_type field
11. Test database type标识 display
12. Verify schema tree tooltip displays table and column comments for both PostgreSQL and MySQL databases

### Testing Tasks

12. Create mysql.rest with 30+ test cases
13. Update postgres.rest if API changes require
14. Manual E2E testing for MySQL workflows
15. Verify PostgreSQL functionality unchanged

### Documentation Tasks

16. Update CLAUDE.md with MySQL database info
17. Update API documentation (OpenAPI)
18. Add MySQL troubleshooting guide

## Implementation Order

**Critical Path** (must complete in order):
1. Dependencies → Model changes → Connection service → Metadata service → Query service → NL to SQL
2. Frontend updates (can proceed in parallel with backend)
3. Testing (after backend completion)
4. Documentation (ongoing, finalize at end)

**Risk Areas**:
- MySQL metadata extraction: information_schema queries may differ significantly
- NL to SQL: Prompt engineering may need iteration for MySQL syntax accuracy
- Error handling: MySQL error messages format may differ from PostgreSQL
