# Research: Database Query Tool

**Date**: 2026-04-27 | **Branch**: `001-db-query-tool`

## R1: FastAPI + SQLAlchemy Async for PostgreSQL Metadata

### Decision
Use SQLAlchemy async with `NullPool` for dynamic per-query PostgreSQL connections. Use `aiosqlite` for local metadata storage. Use Pydantic `alias_generator=to_camel` for CamelCase API responses.

### Rationale
- `NullPool` disables connection pooling — appropriate since each user provides different connection strings
- `asyncpg` driver is the de facto async PostgreSQL driver for Python
- `information_schema` queries are SQL-standard and portable (supports FR-014 extensibility)
- `to_camel` from `pydantic.alias_generators` handles CamelCase serialization automatically

### Key Patterns
- Dynamic engine: `create_async_engine(url, poolclass=NullPool, connect_args={"timeout": 30})` + `await engine.dispose()` after use
- Metadata query: `SELECT t.table_schema, t.table_name, t.table_type, c.* FROM information_schema.tables t JOIN information_schema.columns c ON ... WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')`
- Raw SQL to JSON: `result.keys()` for columns, `result.mappings().all()` for rows, wrap with `dict()`
- SQLite local storage: `create_async_engine("sqlite+aiosqlite:///~/.db_query/db_query.db")` with `async_sessionmaker`
- Table creation via `conn.run_sync(Base.metadata.create_all)` in FastAPI lifespan
- CORS: `CORSMiddleware(allow_origins=["*"], allow_credentials=False)` — credentials MUST be False with wildcard origins

### Alternatives Considered
- **psycopg2/psycopg3 async**: asyncpg is faster and more widely used for async Python
- **pg_catalog queries (pg_class, pg_attribute)**: PostgreSQL-specific, sacrifices portability for marginal speed gain
- **SQLAlchemy inspect()**: requires ORM models; not suitable for raw schema discovery
- **Engine cache per connection string**: over-engineering for single-user demo

---

## R2: sqlglot SQL Validation

### Decision
Use `sqlglot.parse_one()` for single-statement parsing, `isinstance()` check against allow-list `(exp.Select, exp.Union)`, `ast.args.get("limit")` for outer LIMIT detection, and `ast.set("limit", ...)` for LIMIT injection.

### Rationale
- sqlglot builds a real AST and validates syntax — raises `ParseError` with structured error details (`e.errors` list with `description`, `line`, `col`)
- Statement type identification via `isinstance()` is reliable: `exp.Select`, `exp.Insert`, `exp.Update`, `exp.Delete`, etc.
- `ast.args.get("limit")` checks only top-level LIMIT (not subqueries) — correct per FR-019
- `ast.sql()` regenerates SQL from modified AST
- Zero external dependencies

### Key Patterns
```python
from sqlglot import parse_one, exp
from sqlglot.errors import ParseError

def validate_and_enrich(sql: str, default_limit: int = 1000) -> tuple[str, str | None]:
    ast = parse_one(sql)  # raises ParseError on invalid SQL
    if not isinstance(ast, (exp.Select, exp.Union)):
        raise ValueError("仅支持 SELECT 查询")
    if ast.args.get("limit") is None:
        ast.set("limit", exp.Limit(expression=exp.Literal.number(default_limit)))
    return ast.sql(), None
```

### Caveats
- `ParseError.errors` descriptions can contain raw token info — clean up for user-facing messages
- `parse_one()` parses first statement only — use `sqlglot.parse(sql)` to detect multi-statement injection
- Empty string raises `ParseError("No expression was parsed")` — handle before calling parse
- `sqlglot.parse(None)` raises `TypeError` — guard against None inputs

### Alternatives Considered
- **sqlparse**: Rejected — non-validating parser, never rejects invalid SQL, no AST
- **sqlfluff**: Rejected — linter-focused, 88x slower, heavy dependency
- **regex/string matching**: Rejected — fragile, misses edge cases with subqueries/CTEs/comments

---

## R3: refine 5 + Ant Design + Monaco Editor Frontend

### Decision
Use Vite + React + TypeScript SPA with refine 5 as framework layer, Ant Design v5 as component library, Tailwind CSS v4 for layout/utility styles, and `@monaco-editor/react` as SQL editor. Custom data provider for the non-standard REST API.

### Rationale
- refine 5 provides data provider abstraction, TanStack Query caching, and Ant Design hooks
- Ant Design v5 uses CSS-in-JS (`@ant-design/cssinjs`) — coexists with Tailwind without global CSS conflicts
- Monaco Editor provides SQL syntax highlighting, `pgsql` dialect, and autocompletion
- Custom layout (IDE-style panels) instead of refine's default admin `ThemedLayoutV2`

### Key Patterns
- **Custom data provider**: Map `getList` → `GET /api/v1/dbs`, `getOne` → `GET /api/v1/dbs/{name}`, `create` → `PUT /api/v1/dbs/{name}`, `deleteOne` → `DELETE /api/v1/dbs/{name}`, `custom` → query/natural endpoints
- **SQL query execution**: Use refine's `useCustom` hook with `method: "post"` and `config.payload`
- **Layout**: IDE-style with fixed sidebar (DB list + schema tree) and main area (Monaco editor + results table)
- **Tailwind prefix**: Optional `tw:` prefix to avoid Ant Design class name collisions
- **Monaco setup**: `language="pgsql"`, `theme="vs-dark"`, register completion provider for schema objects

### UI Component Mapping
| UI Section | Component | Library |
|---|---|---|
| Database list | `<List>` with items | Ant Design |
| Schema tree | `<Tree>` with DirectoryTree | Ant Design |
| SQL editor | `<Editor language="pgsql">` | @monaco-editor/react |
| Results table | `<Table>` with dynamic columns | Ant Design |
| NL input | `<Input.TextArea>` | Ant Design |
| Layout grid | CSS flexbox via Tailwind | Tailwind CSS |

### Alternatives Considered
- **refine ThemedLayoutV2**: Rejected — creates admin panel layout, this project needs IDE-style panels
- **Next.js**: Rejected — SSR complexity unnecessary for single-user demo
- **CodeMirror 6**: Lighter but Monaco has better SQL support out-of-the-box
- **@refinedev/simple-rest**: Rejected — backend API is non-standard, custom provider is simpler

---

## R4: OpenAI SDK for Natural Language to SQL

### Decision
Use Chat Completions API with Structured Outputs via `client.beta.chat.completions.parse()` and a Pydantic `response_format` model. System prompt in Chinese with DDL-style schema context.

### Rationale
- Structured Outputs guarantee the response conforms to the Pydantic schema — no regex parsing needed
- `client.beta.chat.completions.parse()` returns `.parsed` attribute with the Pydantic model instance
- DDL-style schema format (`CREATE TABLE` with Chinese column comments) is token-efficient and unambiguous
- `temperature=0` for deterministic SQL generation
- `max_retries=2` for built-in exponential backoff on transient errors

### Key Patterns
```python
from openai import OpenAI
from pydantic import BaseModel, Field

class SQLGenerationResult(BaseModel):
    sql: str = Field(description="Generated PostgreSQL SELECT query")
    explanation: str | None = Field(default=None, description="Brief explanation in Chinese")

client = OpenAI(api_key=settings.openai_api_key, timeout=30.0, max_retries=2)

response = client.beta.chat.completions.parse(
    model="gpt-4o",
    temperature=0,
    messages=[
        {"role": "system", "content": system_prompt_with_schema_ddl},
        {"role": "user", "content": user_question},
    ],
    response_format=SQLGenerationResult,
)
result = response.choices[0].message.parsed
```

### Error Handling (OpenAI SDK exceptions → Chinese messages)
| Exception | User Message |
|---|---|
| `AuthenticationError` | OpenAI API 密钥无效 |
| `RateLimitError` | 请求过于频繁，请稍后重试 |
| `APITimeoutError` | 请求超时，请稍后重试 |
| `APIConnectionError` | 无法连接到 OpenAI 服务 |
| `InternalServerError` | OpenAI 服务暂时不可用 |

### Schema DDL Format
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,        -- 用户ID
  name VARCHAR(100) NOT NULL,   -- 用户名
  email VARCHAR(255)            -- 邮箱
);
```

### Alternatives Considered
- **Function Calling**: Rejected — overkill for always-SQL pipeline, not a tool-selection decision
- **JSON Mode (`json_object`)**: Rejected — only guarantees valid JSON, not schema adherence
- **Freeform text + regex**: Rejected — fragile, model may wrap SQL in markdown blocks
- **Responses API**: Viable alternative, but Chat Completions is more widely documented and stable
