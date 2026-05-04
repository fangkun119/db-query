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

# Set environment variables
export OPENAI_API_KEY="sk-..."

# Configure default LIMIT (optional, defaults to 1000)
export DEFAULT_LIMIT=1000

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

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | yes (for NL) | — | OpenAI API key |
| `DEFAULT_LIMIT` | no | `1000` | Default LIMIT for queries without LIMIT |
| `DB_QUERY_DB_PATH` | no | `~/.db_query/db_query.db` | SQLite database path |
| `OPENAI_MODEL` | no | `gpt-4o` | OpenAI model for NL→SQL |
| `CORS_ORIGINS` | no | `*` | Allowed CORS origins |

## Running Tests

```bash
# Backend tests
cd backend
uv run pytest

# Frontend tests
cd frontend
npm test
```
