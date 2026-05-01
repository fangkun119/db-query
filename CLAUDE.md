<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/001-db-query-tool/plan.md`
<!-- SPECKIT END -->

## Test Databases

### Available Test Databases

| Database | Connection URL | Purpose | Tables |
|----------|----------------|---------|--------|
| `interview_db` | `postgresql://postgres@localhost:5432/interview_db` | Full-featured interview management system with rich seed data | 23 |
| `empty_db` | `postgresql://postgres@localhost:5432/empty_db` | Empty database for edge case testing | 0 |

### Database Scripts Location

- **Main script**: `/Users/ken/Code/cursor/db-query/test/db_scripts/postgres/interview_db.sql`
- **Fix scripts**: `/Users/ken/Code/cursor/db-query/test/db_scripts/postgres/fix_*.sql`

### Recreating Test Databases

```bash
# Recreate interview_db (full data)
psql -U postgres -f /Users/ken/Code/cursor/db-query/test/db_scripts/postgres/interview_db.sql

# Recreate empty_db
psql -U postgres -c "DROP DATABASE IF EXISTS empty_db; CREATE DATABASE empty_db WITH OWNER = postgres ENCODING 'UTF8';"
```

### interview_db Schema Highlights

**Core tables for query testing:**
- `positions` - Job positions with salary ranges and requirements
- `candidates` - Candidate profiles with experience and expected salary
- `candidate_position_applications` - Application records linking candidates to positions
- `interview_schedules` - Scheduled interviews with interviewers and times
- `interview_results` - Interview outcomes with ratings and recommendations
- `offers` - Job offers with salary and benefits
- `employees` - Company employees including interviewers
- `departments` - Company departments

**Sample queries for testing:**
```sql
-- View all open positions
SELECT * FROM positions WHERE status = 'open';

-- Candidates in interview pipeline
SELECT c.first_name, c.last_name, p.title, c.status
FROM candidates c
JOIN candidate_position_applications a ON c.id = a.candidate_id
JOIN positions p ON a.position_id = p.id
WHERE c.status IN ('screening', 'interviewing', 'offered')
ORDER BY c.status, c.last_name;

-- Interview results with ratings
SELECT c.first_name, c.last_name, p.title, 
       ir.round_name, rr.overall_rating, rr.recommendation
FROM interview_results rr
JOIN interview_schedules s ON rr.schedule_id = s.id
JOIN candidate_position_applications a ON s.application_id = a.id
JOIN candidates c ON a.candidate_id = c.id
JOIN positions p ON a.position_id = p.id
LEFT JOIN interview_rounds ir ON s.round_id = ir.id
ORDER BY rr.overall_rating DESC;

-- Complex JOIN: Interview workflow
SELECT c.first_name || ' ' || c.last_name AS candidate,
       c.email, p.title, s.scheduled_start_time, 
       rr.overall_rating, rr.recommendation, o.base_salary
FROM candidates c
JOIN candidate_position_applications a ON c.id = a.candidate_id
JOIN positions p ON a.position_id = p.id
LEFT JOIN interview_schedules s ON a.id = s.application_id AND s.status = 'completed'
LEFT JOIN interview_results rr ON s.id = rr.schedule_id
LEFT JOIN offers o ON a.id = o.application_id
WHERE c.status IN ('interviewing', 'hired')
ORDER BY s.scheduled_start_time DESC;
```

### empty_db Usage

Use `empty_db` to test edge cases:
- Querying non-existent tables → verify error handling
- Empty result sets → verify UI handles no data
- Invalid SQL syntax → verify validation messages
- LIMIT injection on simple queries

## Development Commands

### Makefile

**Location**: `/Users/ken/Code/cursor/db-query/Makefile`

```bash
# Common commands
make help              # Show all available commands
make install           # Install all dependencies (backend + frontend)
make dev               # Start both dev servers (backend :8000, frontend :5173)
make test              # Run backend tests
make lint              # Run frontend linter
make build             # Build frontend for production
make clean             # Clean all build artifacts

# Backend only
make backend-install   # Install backend dependencies (uv sync)
make backend-dev       # Start backend dev server with auto-reload
make backend-test      # Run pytest tests
make backend-run       # Start backend server (no reload)

# Frontend only
make frontend-install  # Install frontend dependencies (npm install)
make frontend-dev      # Start frontend dev server (Vite)
make frontend-build    # Build frontend for production
make frontend-lint     # Run ESLint
```

### Quick Start

```bash
# First time setup
make install

# Daily development
make dev              # Starts both servers
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# API docs: http://localhost:8000/docs
```

### REST API Testing

**Location**: `/Users/ken/Code/cursor/db-query/test/rest/postgres.rest`

```bash
# Create test database first
make test-db

# Show testing instructions
make test-api

# Or manually:
# 1. Install VSCode REST Client extension
# 2. Open test/rest/postgres.rest
# 3. Start backend: make backend-dev
# 4. Click "Send Request" above each test
```

**Available API Endpoints:**
- `GET /api/v1/dbs` - List all databases
- `PUT /api/v1/dbs/{name}` - Add database connection
- `GET /api/v1/dbs/{name}` - Get database details with metadata
- `DELETE /api/v1/dbs/{name}` - Delete database connection
- `POST /api/v1/dbs/{name}/refresh` - Refresh database metadata
- `POST /api/v1/dbs/{name}/query` - Execute SQL query
