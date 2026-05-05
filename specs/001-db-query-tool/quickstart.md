# Quickstart: Database Query Tool

**Date**: 2026-04-27 | **Branch**: `001-db-query-tool`

## Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- [uv](https://docs.astral.sh/uv/) package manager
- A running PostgreSQL database (for testing)
- OpenAI API key (for NL→SQL feature)

## Backend Setup

```bash
cd backend

# Install dependencies
uv sync

# Create configuration file at ~/.db_query/env.properties
mkdir -p ~/.db_query
cat > ~/.db_query/env.properties << 'EOF'
# OpenAI API Configuration
OPENAI_API_KEY=sk-...
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# Query Configuration
DEFAULT_LIMIT=1000

# Optional Configuration
# DB_QUERY_DB_PATH=~/.db_query/db_query.db
# CORS_ORIGINS=*
EOF

# Run the server
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
API docs (Swagger) at `http://localhost:8000/docs`.

### Backend Dependencies

```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
aiosqlite
pydantic
pydantic-settings
sqlglot
openai
```

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

The frontend will be available at `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

### Frontend Dependencies

```
@refinedev/core
@refinedev/antd
@refinedev/react-router
antd
@ant-design/icons
react-router
@monaco-editor/react
axios
tailwindcss (v4, via @tailwindcss/vite plugin)
```

## Quick Test

1. Start both backend and frontend servers
2. Open `http://localhost:5173`
3. Click "添加数据库" and enter a PostgreSQL connection URL
4. Click on the database to see tables and views
5. Write a SQL query in the editor and click "执行"
6. Or type a natural language question and click "生成 SQL"

## Configuration

Configuration is stored in `~/.db_query/env.properties`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | yes (for NL) | — | OpenAI API key |
| `DEFAULT_LIMIT` | no | `1000` | Default LIMIT for queries without LIMIT clause |
| `OPENAI_API_ENDPOINT` | no | `https://api.openai.com/v1` | OpenAI API endpoint |
| `OPENAI_MODEL` | no | `gpt-4o` | OpenAI model for NL→SQL |
| `DB_QUERY_DB_PATH` | no | `~/.db_query/db_query.db` | SQLite database path |
| `CORS_ORIGINS` | no | `*` | Allowed CORS origins (comma-separated) |

## Running Tests

```bash
# Backend tests
cd backend
uv run pytest

# Frontend tests
cd frontend
npm test
```
