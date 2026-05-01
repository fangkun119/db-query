<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/001-db-query-tool/plan.md`
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

| Database | Connection URL | Purpose |
|----------|----------------|---------|
| `interview_db` | `postgresql://postgres@localhost:5432/interview_db` | Full-featured test data (23 tables) |
| `empty_db` | `postgresql://postgres@localhost:5432/empty_db` | Edge case testing (0 tables) |

**Schema highlights**: `positions`, `candidates`, `candidate_position_applications`, `interview_schedules`, `interview_results`, `offers`, `employees`, `departments`

```bash
# Recreate test databases
psql -U postgres -f test/db_scripts/postgres/interview_db.sql
psql -U postgres -c "DROP DATABASE IF EXISTS empty_db; CREATE DATABASE empty_db WITH OWNER = postgres ENCODING 'UTF8';"
```

## API Testing

**REST Client file**: [test/rest/postgres.rest](test/rest/postgres.rest) (30+ cases: health, dbs, query, errors)

| Prerequisite | Command |
|--------------|---------|
| VSCode REST Client extension | Install from marketplace |
| Backend server | `make backend-dev` |
| Test database | `make test-db` |

**Usage**: Open `.rest` file → Click "Send Request" above each test
