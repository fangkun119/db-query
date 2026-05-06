<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plans:
- Phase 6 implementation: `specs/001-db-query-tool/plan.md`
- MySQL database support: `specs/002-mysql-support/plan.md`
<!-- SPECKIT END -->

## Development Commands

```bash
# Quick start
make install           # Install all dependencies (backend uv sync + frontend npm)
make dev               # Start both servers (backend :8000, frontend :5173)

# Backend only
make backend-dev       # Start FastAPI with auto-reload
make backend-test      # Run pytest (54 tests)
cd backend && uv run pytest tests/test_validator.py -v  # Single test file

# Frontend only
make frontend-dev      # Start Vite dev server
make frontend-lint     # Run ESLint
npm run test           # Vitest unit tests (21 tests)
npm run test:e2e       # Playwright E2E tests (12 tests)

# Testing
make test-db           # Create test PostgreSQL database (interview_db)
make test-api          # Show REST Client testing instructions
```

## Test Databases

### PostgreSQL

| Database | Connection URL | Purpose |
|----------|----------------|---------|
| `interview_db` | `postgresql://postgres@localhost:5432/interview_db` | Full-featured test data (23 tables) |
| `empty_db` | `postgresql://postgres@localhost:5432/empty_db` | Edge case testing (0 tables) |

**Schema highlights**: `positions`, `candidates`, `candidate_position_applications`, `interview_schedules`, `interview_results`, `offers`, `employees`, `departments`

```bash
# Recreate PostgreSQL test databases
psql -U postgres -f test/db_scripts/postgres/interview_db.sql
psql -U postgres -c "DROP DATABASE IF EXISTS empty_db; CREATE DATABASE empty_db WITH OWNER = postgres ENCODING 'UTF8';"
```

### MySQL

| Database | Connection URL | Purpose |
|----------|----------------|---------|
| `todo_db` | `mysql://todo_db:todo_tb@localhost:3306/todo_db` | Todo management system (20 tables, 2000+ tasks) |

**Schema highlights**: `users`, `organizations`, `projects`, `tasks`, `sprints`, `task_comments`, `task_history`, `time_entries`, `labels`, `notifications`

```bash
# Recreate MySQL test database
mysql -u root -p < test/db_scripts/mysql/todo_db.sql
```

## API Testing

**REST Client files**:
- [test/rest/postgres.rest](test/rest/postgres.rest) (40+ cases: health, dbs, query, errors)
- [test/rest/mysql.rest](test/rest/mysql.rest) (54+ cases: health, dbs, query, MySQL-specific syntax, NL to SQL)

| Prerequisite | Command |
|--------------|---------|
| VSCode REST Client extension | Install from marketplace |
| Backend server | `make backend-dev` |
| PostgreSQL test database | `psql -U postgres -f test/db_scripts/postgres/interview_db.sql` |
| MySQL test database | `mysql -u root -p < test/db_scripts/mysql/todo_db.sql` |

**Usage**: Open `.rest` file → Click "Send Request" above each test

**Supported Database Types**: PostgreSQL (`postgresql://`) and MySQL (`mysql://`)
