# Implementation Plan: Database Query Tool

**Branch**: `001-db-query-tool` | **Date**: 2026-04-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-db-query-tool/spec.md`

## Summary

A web-based database query tool that allows users to connect to PostgreSQL databases, explore schema metadata, execute SQL queries, and generate SQL from natural language using OpenAI GPT-4o. Backend built with Python/FastAPI, frontend with React/refine 5/Ant Design/Monaco Editor. Metadata and connections stored locally in SQLite.

## Technical Context

**Language/Version**: Python 3.14 (managed by uv), TypeScript 5.0+ (strict mode)
**Primary Dependencies**: FastAPI 0.136+, SQLAlchemy (async + aiosqlite + asyncpg), sqlglot, openai SDK, React 19, refine 5, Ant Design 6, Tailwind CSS v4, Monaco Editor
**Storage**: Local SQLite (~/.db_query/db_query.db) for connections/metadata; user PostgreSQL databases for queries
**Testing**: pytest (backend), vitest + React Testing Library (frontend)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (monorepo with backend/ and frontend/)
**Performance Goals**: Schema display < 30s, query execution < 5s, NL→SQL < 10s
**Constraints**: 30s connection timeout, configurable LIMIT (default 1000), single-user demo
**Scale/Scope**: Demo application, ~6 API endpoints, 3 main UI pages, PostgreSQL only (v1)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Demo-First Access | PASS | No authentication required (FR-036) |
| II. Python Ergonomics | PASS | Pydantic models for all data structures (FR-011, Key Entities) |
| III. Type Safety Frontend | PASS | TypeScript strict mode planned |
| Backend Stack: Python + UV | PASS | uv package manager, Pydantic models |
| Frontend Stack: TypeScript strict | PASS | strict mode enabled |
| API Contracts: CamelCase | PASS | All responses use CamelCase via Pydantic alias_generator=to_camel |
| Data Modeling: Pydantic only | PASS | No scattered dictionaries |

**Gate Result**: PASS — all principles satisfied. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-db-query-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── pyproject.toml           # uv project config, dependencies
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py            # Settings (env vars, defaults)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py      # DB connection Pydantic models
│   │   ├── metadata.py      # Table/View/Column Pydantic models
│   │   └── query.py         # Query request/result Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── connection.py    # DB connection management
│   │   ├── metadata.py      # Metadata fetch/parse service
│   │   ├── query.py         # SQL execution service
│   │   ├── validator.py     # sqlglot validation + LIMIT injection
│   │   └── nl_to_sql.py     # OpenAI NL→SQL service
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── databases.py # /api/v1/dbs/* endpoints
│   └── db/
│       ├── __init__.py
│       └── sqlite.py        # SQLite engine/session for local storage
└── tests/
    ├── conftest.py
    ├── test_validator.py
    ├── test_connection.py
    ├── test_metadata.py
    └── test_query.py

frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── providers/
│   │   └── data-provider.tsx # refine data provider for REST API
│   ├── components/
│   │   ├── layout/
│   │   │   └── app-layout.tsx
│   │   ├── database/
│   │   │   ├── database-list.tsx
│   │   │   └── database-form.tsx
│   │   ├── schema/
│   │   │   └── schema-tree.tsx
│   │   ├── editor/
│   │   │   ├── sql-editor.tsx
│   │   │   └── nl-input.tsx
│   │   └── results/
│   │       └── result-table.tsx
│   ├── pages/
│   │   ├── databases.tsx     # DB list + add/delete
│   │   └── database-detail.tsx  # DB detail (metadata + query)
│   ├── services/
│   │   └── api.ts            # API client (axios)
│   └── types/
│       └── index.ts          # TypeScript interfaces matching API contracts
└── tests/
```

**Structure Decision**: Web application structure with separate `backend/` and `frontend/` directories. Backend follows FastAPI conventional layout with models/services/api layers. Frontend follows refine 5 conventions with page-based routing.

## Design Decisions

### D1: Async SQLAlchemy
Use async SQLAlchemy with `asyncpg` for PostgreSQL and `aiosqlite` for local SQLite. FastAPI is async-native; async drivers are the natural fit. `NullPool` for dynamic user-provided connection strings.

### D2: OpenAI Structured Outputs
Use Chat Completions with Structured Outputs (`client.beta.chat.completions.parse()`) to guarantee valid JSON response. Pydantic model as `response_format`. Temperature 0 for deterministic SQL.

### D3: SQL Validation Pipeline
`parse_one()` → `isinstance(exp.Select)` → LIMIT detection/injection → execute. Reject non-SELECT. Handle empty input and multi-statement edge cases.

### D4: IDE-Style Frontend Layout
Left sidebar (DB list + schema tree), main area (Monaco editor top + results table bottom). Custom layout, not refine ThemedLayoutV2.

### D5: Metadata as JSON
Metadata stored as JSON string in SQLite column. Simple for demo scope, avoids complex relational modeling for cached read-heavy data.

## Complexity Tracking

> No violations to justify. All constitution gates pass.
