# Tasks: Database Query Tool

**Input**: Design documents from `/specs/001-db-query-tool/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md

**Tests**: Not explicitly requested — no test tasks included. Backend test scaffolding (conftest.py, test_*.py) can be added post-MVP.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Initialize backend project with uv in `backend/` — create pyproject.toml with Python 3.14, add dependencies: fastapi, uvicorn[standard], sqlalchemy[asyncio], asyncpg, aiosqlite, pydantic, pydantic-settings, sqlglot, openai; run `uv sync`
- [ ] T002 [P] Initialize frontend project with Vite in `frontend/` — create package.json with React 19, TypeScript strict, add dependencies: @refinedev/core, @refinedev/antd, @refinedev/react-router, antd, @ant-design/icons, react-router, @monaco-editor/react, axios, tailwindcss v4 via @tailwindcss/vite; run `npm install`
- [ ] T003 [P] Create backend directory structure — create all `__init__.py` files under `backend/app/`, `backend/app/models/`, `backend/app/services/`, `backend/app/api/`, `backend/app/api/v1/`, `backend/app/db/`, and `backend/tests/`
- [ ] T004 [P] Configure frontend tooling — create `frontend/tsconfig.json` with strict mode, `frontend/vite.config.ts` with Tailwind v4 plugin and API proxy to localhost:8000, `frontend/src/index.css` with Tailwind import

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story work begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [X] T005 Create settings module in `backend/app/config.py` — use pydantic-settings BaseSettings with fields: openai_api_key (str), default_limit (int, default 1000), db_query_db_path (str, default ~/.db_query/db_query.db), openai_model (str, default gpt-4o), cors_origins (str, default *)
- [X] T006 [P] Create SQLite database setup in `backend/app/db/sqlite.py` — async engine with aiosqlite, async_sessionmaker, DatabaseConnection SQLAlchemy model matching data-model.md DDL, create_all in run_sync
- [X] T007 [P] Create database Pydantic models in `backend/app/models/database.py` — CreateConnectionRequest, DatabaseSummaryResponse, DatabaseDetailResponse with alias_generator=to_camel per data-model.md
- [X] T008 [P] Create metadata Pydantic models in `backend/app/models/metadata.py` — ColumnMetadata, TableMetadata, ColumnMetadataResponse, TableMetadataResponse with alias_generator=to_camel per data-model.md
- [X] T009 [P] Create query Pydantic models in `backend/app/models/query.py` — QueryRequest, NaturalQueryRequest, QueryResultResponse, NLQueryResponse with alias_generator=to_camel per data-model.md
- [X] T010 Create FastAPI app skeleton in `backend/app/main.py` — CORS middleware (allow_origins=["*"], allow_credentials=False), lifespan with SQLite table creation, include v1 router prefix

### Frontend Foundation

- [X] T011 [P] Create TypeScript interfaces in `frontend/src/types/index.ts` — match all API contracts: DatabaseSummary, DatabaseDetail, TableMeta, ColumnMeta, QueryResult, NLQueryResponse, QueryRequest, NaturalQueryRequest
- [X] T012 [P] Create API client in `frontend/src/services/api.ts` — axios instance with baseURL /api/v1, export typed functions: listDbs, addDb, getDb, deleteDb, refreshDb, executeQuery, naturalQuery
- [X] T013 [P] Create refine data provider in `frontend/src/providers/data-provider.tsx` — map getList→GET /dbs, getOne→GET /dbs/{name}, create→PUT /dbs/{name}, deleteOne→DELETE /dbs/{name}, custom→query/natural endpoints
- [X] T014 [P] Create IDE-style app layout in `frontend/src/components/layout/app-layout.tsx` — fixed left sidebar (DB list + schema tree) and main area (editor + results), using Tailwind flexbox per plan.md D4
- [X] T015 Create refine app entry in `frontend/src/App.tsx` and `frontend/src/main.tsx` — setup Refine with data provider, routerProvider, Ant Design layout, route definitions for / and /dbs/:name

**Checkpoint**: Foundation ready — both servers start, API health check works, frontend renders empty layout

---

## Phase 3: User Story 1 — Database Connection and Metadata Explorer (Priority: P1) 🎯 MVP

**Goal**: Users can add a PostgreSQL connection URL, see connection status, browse tables/views and their column details, and delete connections

**Independent Test**: Add a valid PostgreSQL URL → verify tables and views appear with column info → refresh metadata → delete connection

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create connection service in `backend/app/services/connection.py` — add_connection (validate postgresql:// prefix, test connection, store to SQLite), list_connections, get_connection, delete_connection; use NullPool async engines per research.md R1
- [ ] T017 [P] [US1] Create metadata service in `backend/app/services/metadata.py` — fetch_metadata: query information_schema.tables JOIN columns, filter out pg_catalog/information_schema schemas, group into TableMetadata/ColumnMetadata, serialize to JSON; parse_metadata: deserialize JSON to response models
- [ ] T018 [US1] Create database API endpoints in `backend/app/api/v1/databases.py` — PUT /dbs/{name} (add), GET /dbs (list), GET /dbs/{name} (detail with metadata), DELETE /dbs/{name}, POST /dbs/{name}/refresh; error responses per contracts/api.md with Chinese detail messages
- [ ] T019 [US1] Wire database router into FastAPI app in `backend/app/main.py` — include API router with prefix /api/v1
- [ ] T020 [P] [US1] Create database list component in `frontend/src/components/database/database-list.tsx` — Ant Design List showing connections with name, status badge, table/view counts, last refreshed time, delete button with confirm
- [ ] T021 [P] [US1] Create database form component in `frontend/src/components/database/database-form.tsx` — Ant Design Modal with Input for connection name and Input for PostgreSQL URL, submit calls addDb, error display for connection failures
- [ ] T022 [P] [US1] Create schema tree component in `frontend/src/components/schema/schema-tree.tsx` — Ant Design DirectoryTree displaying tables/views grouped by schema, expand to show column name, data type, nullable badge
- [ ] T023 [US1] Create databases list page in `frontend/src/pages/databases.tsx` — render DatabaseList component, "添加数据库" button opening DatabaseForm modal, navigation to detail page on click
- [ ] T024 [US1] Create database detail page in `frontend/src/pages/database-detail.tsx` — left panel with SchemaTree, refresh metadata button, connection status display; main area reserved for query editor (US2)

**Checkpoint**: User Story 1 complete — can add/delete connections, browse schema metadata, refresh metadata. Fully testable end-to-end.

---

## Phase 4: User Story 2 — SQL Query Execution (Priority: P2)

**Goal**: Users can write SQL in Monaco editor, execute SELECT queries, and view results in a table with truncation indicator

**Independent Test**: Connect to DB → type SELECT query → execute → verify results in table → test with no-LIMIT query to see truncation message

### Implementation for User Story 2

- [ ] T025 [P] [US2] Create SQL validator service in `backend/app/services/validator.py` — validate_and_enrich: parse_one(sql), reject non-SELECT/UNION with "仅支持 SELECT 查询", detect outer LIMIT, inject default LIMIT if missing, return enriched SQL; handle ParseError with Chinese messages, empty input guard, multi-statement detection per research.md R2
- [ ] T026 [US2] Create query execution service in `backend/app/services/query.py` — execute_query: take connection URL + SQL, call validator, execute via async engine, measure execution time, return QueryResultResponse with column names, row data, truncation flag
- [ ] T027 [US2] Add query endpoint in `backend/app/api/v1/databases.py` — POST /dbs/{name}/query accepting QueryRequest, returns QueryResultResponse; error handling per contracts/api.md (400 for SQL errors, 404, 502)
- [ ] T028 [P] [US2] Create SQL editor component in `frontend/src/components/editor/sql-editor.tsx` — @monaco-editor/react with language="pgsql", theme="vs-dark", value binding, execute button, keyboard shortcut for execution
- [ ] T029 [P] [US2] Create result table component in `frontend/src/components/results/result-table.tsx` — Ant Design Table with dynamic columns from columnNames, row data from rowData, truncation warning banner "仅显示前 {defaultLimit} 行" when isTruncated, execution time display
- [ ] T030 [US2] Integrate query execution in database detail page `frontend/src/pages/database-detail.tsx` — add SqlEditor and ResultTable to main area, wire execute button to executeQuery API, pass results to ResultTable

**Checkpoint**: User Stories 1 AND 2 complete — full SQL query workflow works end-to-end

---

## Phase 5: User Story 3 — Natural Language to SQL Generation (Priority: P3)

**Goal**: Users can type natural language questions in Chinese and get SQL generated via OpenAI GPT-4o, with validation before insertion into editor

**Independent Test**: Connect to DB → type "显示所有用户的订单数量" → verify SQL is generated and inserted into editor → execute and see results

### Implementation for User Story 3

- [ ] T031 [US3] Create NL to SQL service in `backend/app/services/nl_to_sql.py` — build DDL-style schema context from metadata, call OpenAI client.beta.chat.completions.parse() with SQLGenerationResult response_format (temperature=0, max_retries=2), validate generated SQL via validator service, return NLQueryResponse; map OpenAI exceptions to Chinese messages per research.md R4
- [ ] T032 [US3] Add natural query endpoint in `backend/app/api/v1/databases.py` — POST /dbs/{name}/query/natural accepting NaturalQueryRequest, fetch metadata from SQLite, call NL service, validate SQL before returning; error responses per contracts/api.md
- [ ] T033 [P] [US3] Create NL input component in `frontend/src/components/editor/nl-input.tsx` — Ant Design Input.TextArea for Chinese NL question, "生成 SQL" button with loading state, error display for generation failures
- [ ] T034 [US3] Integrate NL query in database detail page `frontend/src/pages/database-detail.tsx` — add NlInput above SqlEditor, on successful generation insert SQL into editor value, on validation error show error message without modifying editor

**Checkpoint**: All user stories complete — full NL→SQL→results workflow works end-to-end

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting improvements that span multiple user stories

- [ ] T035 Add INFO-level logging across all backend services in `backend/app/services/` — log connection operations, query executions, metadata refreshes, and errors; ensure connection URLs with credentials are NOT logged per FR-042
- [ ] T036 [P] Verify all error responses match contracts/api.md — Chinese detail messages, correct HTTP status codes (400, 404, 409, 502, 504), consistent error format { "detail": "..." }
- [ ] T037 Run quickstart.md validation — start both servers, verify full workflow: add connection → browse schema → execute SQL → generate NL→SQL, check API docs at /docs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP deliverable
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 (needs connection + metadata context)
- **User Story 3 (Phase 5)**: Depends on Foundational + US1 (needs connection + metadata) + US2 validator
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P2)**: After Phase 2 — needs US1 connection service and API endpoints, reuses connection management
- **US3 (P3)**: After Phase 2 — needs US1 metadata + US2 validator service for SQL validation

### Within Each Phase

- Models before services
- Services before API endpoints
- API endpoints before frontend integration
- Components before pages
- Pages before routing

### Parallel Opportunities

- Phase 1: T001 (backend init) ‖ T002 (frontend init) ‖ T003 (backend dirs) ‖ T004 (frontend tooling)
- Phase 2 backend: T006 ‖ T007 ‖ T008 ‖ T009 (all different model files)
- Phase 2 frontend: T011 ‖ T012 ‖ T013 ‖ T014 (all different files)
- Phase 3: T016 ‖ T017 (different services) then T018 → T019; T020 ‖ T021 ‖ T022 (different components) then T023 → T024
- Phase 4: T025 ‖ T028 ‖ T029 (different files); T026 → T027 → T030
- Phase 5: T031 → T032; T033 ‖ T031 (different files); T034 depends on T033

---

## Parallel Example: User Story 1

```bash
# Backend services (parallel):
Task T016: "Create connection service in backend/app/services/connection.py"
Task T017: "Create metadata service in backend/app/services/metadata.py"

# After services complete:
Task T018: "Create database API endpoints in backend/app/api/v1/databases.py"

# Frontend components (parallel):
Task T020: "Create database list component in frontend/src/components/database/database-list.tsx"
Task T021: "Create database form component in frontend/src/components/database/database-form.tsx"
Task T022: "Create schema tree component in frontend/src/components/schema/schema-tree.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (~30 min)
2. Complete Phase 2: Foundational (~2 hr)
3. Complete Phase 3: User Story 1 (~3 hr)
4. **STOP and VALIDATE**: Add a real PostgreSQL connection, browse schema
5. Demo-ready — core value delivered

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Demo (MVP!)
3. Add US2 → Test query execution → Demo
4. Add US3 → Test NL→SQL → Demo
5. Polish → Production-ready

### Suggested MVP Scope

**Phase 1 + Phase 2 + Phase 3 (US1)** = 24 tasks delivering the core database exploration experience. Users can connect, browse schema, and understand their data.

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | 4 | Project initialization |
| Phase 2: Foundational | 11 | Core backend + frontend infrastructure |
| Phase 3: US1 (P1) | 9 | Database connection + metadata explorer |
| Phase 4: US2 (P2) | 6 | SQL query execution |
| Phase 5: US3 (P3) | 4 | Natural language to SQL |
| Phase 6: Polish | 3 | Cross-cutting concerns |
| **Total** | **37** | |

- Task count per user story: US1=9, US2=6, US3=4
- Parallel opportunities: 15 tasks marked [P]
- Independent test criteria: Each user story has a checkpoint with test instructions
- MVP scope: Phase 1 + Phase 2 + Phase 3 = 24 tasks
- Format validation: All 37 tasks follow checklist format (checkbox + ID + optional [P] + optional [Story] + description with file path)
