# 需求迭代1 - Demo with Postgres

## 项目思路

### Specify, Plan 阶段共用

```text
这是一个数据库查询工具、用户可以添加一个 Database URL，系统会连接到数据库，获取数据库的 metadata，然后将数据库中的 table 和 view 的信息展示出来，然后用户可以输入SQL查询，也可以通过自然语言生成SQL查询。

基本想法：

- 数据库连接字符串和 metadata 使用 SQLite 本地文件存储（Demo 级方案，暂不引入独立数据库服务）。
- 数据库连接管理：用户可以添加、删除数据库连接；添加连接时系统自动获取并缓存 metadata；暂不支持自动刷新，用户可手动触发刷新。
- metadata 获取：根据数据库类型（PostgreSQL / MySQL 等）查询对应的系统表或执行对应的特定SQL，获取数据表的元数据，将元数据解析成结构化 JSON 格式存储。接口预留扩展点，但不主动实现多数据库抽象层。首版专注 PostgreSQL。
- 当用户使用 LLM 来生成 SQL 查询时，把系统中的表和视图的信息作为 context 传送给 LLM，LLM 根据这些信息生成 SQL 查询。
- 用户输入的任何 SQL 语句，都需要经过 sqlglot 解析，确保语法正确，并且仅包含 SELECT 语句。如果语法不正确，需要给出错误信息提示给用户。
- 如果查询不包含 LIMIT 子句，则默认添加 LIMIT 1000 子句，并在返回结果时告知用户 “仅显示前 1000 行” ，1000可以配置
- 输出格式是 JSON，前端将其组织成表格，并显示出来。
- 这是 Demo 阶段，不需要 Authentication ，任何用户都可以使用

技术：

- 后端使用 Python (uv) / FastAPI / sqlglot / openai sdk 来实现。
- 前端使用 React / refine 5 / tailwind / ant design 来实现。sql editor 使用 monaco editor 来实现。
```

### Plan 阶段补充

```text
OpenAI和数据库配置:
- OpenAI API key 在环境变量 OPENAI_API_KEY 中。
- 数据连接和 metadata 存储在 sqlite 数据库中，放在 ~/.db_query/db_query.db 中。

后端 API 需要支持 cors，允许所有 origin。

后端 API 大致如下：

# 获取所有已存储的数据库
GET /api/v1/dbs

# 添加一个数据库
PUT /api/v1/dbs/{name}
{
	"url": "postgres://postgres:postgres@localhost:5432/postgres"
}

# 获取一个数据库的 metadata
GET /api/v1/dbs/{name}

# 查询某个数据库的信息
POST /api/v1/dbs/{name}/query
{
	"sql": "SELECT * FROM users"
}

# 根据自然语言生成 SQL
POST /api/v1/dbs/{name}/query/natural
{
	"prompt": "查询用户表的所有信息"
}
```

## 项目宪章

```text
1. 核心原则
- Demo阶段不需要 Authentication，任何用户都可以使用

2. 技术约束
- 后端：Python（UV），Ergonomic Python 风格，强调可读性和可维护性
- 前端：TypeScript，优先使用类型安全、可维护性高的方案
- 数据建模：后端所有核心数据结构必须通过 Pydantic 模型定义，禁止散落字典到处飞
- API 契约：后端返回给前端的 JSON 统一使用 CamelCase，前端入参/出参结构必须与后端契约严格对齐

3. 治理
- Demo项目，可随时调整原则
- 审查重点：安全性正确性 > 性能 > 代码风格
```







