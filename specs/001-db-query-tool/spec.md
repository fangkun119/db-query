# Feature Specification: Database Query Tool

**Feature Branch**: `001-db-query-tool`  
**Created**: 2026-04-26  
**Status**: Draft  
**Input**: User description: "这是一个数据库查询工具、用户可以添加一个 Database URL，系统会连接到数据库，获取数据库的 metadata，然后将数据库中的 table 和 view 的信息展示出来，然后用户可以输入SQL查询，也可以通过自然语言生成SQL查询。"

## Clarifications

### Session 2026-04-27

- Q: Which LLM provider should the NL→SQL feature use? → A: OpenAI API (GPT-4o)
- Q: What is the target UI language? → A: 简体中文 (Simplified Chinese) — all user-facing text in Chinese
- Q: How should database connection credentials be protected at rest? → A: Plain text in local SQLite (demo phase, document as known limitation)
- Q: How should stale/unavailable connections be handled? → A: Test-on-use with error message + reconnect prompt
- Q: Should users be able to export query results? → A: No export for demo phase (scoped out, can be added post-demo)
- Q: Should SQL injection protection be implemented? → A: 内部工具，不做注入防护 (internal tool, no injection protection - trusted users only)
- Q: What CORS policy should be used? → A: 允许所有源 (Allow all origins - no CORS restrictions)
- Q: What logging level should be used? → A: INFO 级别 - 记录操作和错误 (INFO level - log operations and errors)
- Q: How should invalid LLM-generated SQL be handled? → A: 在放入编辑器前验证，失败则显示错误 (Validate before inserting into editor, show error if invalid)
- Q: What should the database connection timeout be? → A: 30 秒 - 标准默认值 (30 seconds - standard default)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Database Connection and Metadata Explorer (Priority: P1)

As a data analyst, I want to connect to a PostgreSQL database and view its table and view structure, so that I can understand the data schema before writing queries.

**Why this priority**: This is the foundation for all query functionality. Without being able to connect and see the schema, users cannot effectively write queries.

**Independent Test**: Can be fully tested by adding a PostgreSQL connection URL and verifying that the system displays a list of tables and views with their column information (name, type, nullable).

**Acceptance Scenarios**:

1. **Given** no database connections exist, **When** user adds a valid PostgreSQL connection URL, **Then** system connects successfully and stores the connection
2. **Given** a stored database connection, **When** user views the database, **Then** system displays all tables and views with their column names, data types, and nullability
3. **Given** a database connection, **When** user manually triggers refresh, **Then** system re-fetches and updates the metadata display
4. **Given** an invalid connection URL, **When** user attempts to add it, **Then** system displays a clear error message explaining the connection failure

---

### User Story 2 - SQL Query Execution (Priority: P2)

As a data analyst, I want to write and execute SQL SELECT queries, so that I can retrieve and analyze data from the connected database.

**Why this priority**: After understanding the schema (P1), users need to query data. This is the core value proposition - executing queries safely.

**Independent Test**: Can be fully tested by connecting to a database, writing a SELECT query, executing it, and verifying results are displayed in a table format.

**Acceptance Scenarios**:

1. **Given** a valid SELECT query without LIMIT, **When** user executes the query, **Then** system adds LIMIT 1000, executes, and displays results with a message "仅显示前 1000 行"
2. **Given** a valid SELECT query with LIMIT, **When** user executes the query, **Then** system executes and displays results without modifying the LIMIT clause
3. **Given** a query with syntax errors, **When** user attempts to execute, **Then** system displays a specific error message indicating the syntax issue
4. **Given** a non-SELECT query (INSERT/UPDATE/DELETE), **When** user attempts to execute, **Then** system rejects it with error message "仅支持 SELECT 查询"
5. **Given** a query returning no results, **When** user executes it, **Then** system displays an empty table with column headers

---

### User Story 3 - Natural Language to SQL Generation (Priority: P3)

As a data analyst, I want to describe my data question in plain language, so that I can get SQL queries without memorizing table names and column names.

**Why this priority**: This enhances usability but is not essential - users can still write SQL manually. The system provides value without it.

**Independent Test**: Can be fully tested by connecting to a database with known schema, entering a natural language question, and verifying the generated SQL is executable and returns relevant results.

**Acceptance Scenarios**:

1. **Given** a database connection with metadata, **When** user enters "显示所有用户的订单数量", **Then** system generates a valid SQL query joining users and orders tables
2. **Given** generated SQL, **When** user reviews and executes it, **Then** results match the intent of the natural language question
3. **Given** an ambiguous natural language question, **When** user submits it, **Then** system generates best-effort SQL that user can modify before execution
4. **Given** a natural language question referencing non-existent tables, **When** user submits it, **Then** system informs user about the available tables

---

### Edge Cases

- What happens when a database connection times out or becomes unavailable after being added? → Test-on-use: system detects failure when user interacts with the connection, displays error message with "重新连接" (reconnect) option
- How does system handle queries that would return extremely large datasets (millions of rows)? → Handled by configurable LIMIT (FR-018/FR-019)
- What happens when user provides a connection URL for an unsupported database type (e.g., MongoDB)? → System validates URL format and rejects unsupported types with clear error message listing supported databases (PostgreSQL only for v1)
- How does system handle concurrent queries from multiple users? → Not applicable for demo (single-user, local-only), connections are ephemeral per-query
- What happens when LLM generates invalid SQL syntax? → System validates using sqlglot before inserting into editor; if invalid, displays error message with validation details and does NOT populate editor with broken SQL
- How does system handle tables or columns with special characters or reserved keywords? → System preserves original names from database; SQL editor and query execution rely on database engine's native quoting behavior
- What happens when metadata fetch fails due to insufficient database permissions? → System displays error message indicating permission issue and suggests contacting database administrator
- How does system handle connection strings that contain sensitive credentials? → Stored in plain text in local SQLite for demo phase; documented as known limitation

## Requirements *(mandatory)*

### Functional Requirements

#### Database Connection Management

- **FR-001**: System MUST allow users to add a database connection by providing a connection URL
- **FR-002**: System MUST validate that the connection URL is in a supported format before attempting connection
- **FR-003**: System MUST store database connection URLs and associated metadata in a local SQLite database (plain text for demo phase; encryption is a future improvement)
- **FR-004**: System MUST allow users to delete stored database connections
- **FR-005**: System MUST automatically fetch and cache database metadata when a connection is first added
- **FR-006**: System MUST provide a manual refresh button to re-fetch metadata for an existing connection
- **FR-007**: System MUST display connection status (connected/disconnected/error) for each stored connection; status is checked on-use (when user queries or views metadata) rather than via background polling, with a reconnect prompt on failure
- **FR-008**: System MUST timeout database connection attempts after 30 seconds

#### Metadata Discovery and Display

- **FR-009**: System MUST connect to PostgreSQL databases and retrieve table and view metadata
- **FR-010**: System MUST query PostgreSQL information_schema to extract table names, view names, and column details
- **FR-011**: System MUST parse and store metadata in a structured JSON format including: table/view name, column name, data type, and nullability
- **FR-012**: System MUST display all tables and views in a browsable format
- **FR-013**: System MUST allow users to click on a table/view to see its detailed column information
- **FR-014**: System MUST support extensibility for adding other database types (MySQL, etc.) in future releases

#### SQL Query Execution

- **FR-015**: System MUST provide a SQL editor where users can input and edit SQL queries
- **FR-016**: System MUST parse all SQL queries using sqlglot before execution
- **FR-017**: System MUST validate SQL syntax and display specific error messages for syntax errors
- **FR-018**: System MUST reject any SQL statement that is not a SELECT query
- **FR-019**: System MUST automatically add "LIMIT 1000" to queries that do not contain a LIMIT clause
- **FR-020**: System MUST make the LIMIT threshold configurable
- **FR-021**: System MUST execute validated SELECT queries against the connected database
- **FR-022**: System MUST return query results in JSON format with column names and row data
- **FR-023**: System MUST display a message when results are truncated by the automatic LIMIT

#### Natural Language to SQL Generation

- **FR-024**: System MUST provide an input field for natural language queries
- **FR-025**: System MUST send database metadata (tables, views, columns) as context to OpenAI API (GPT-4o)
- **FR-026**: System MUST generate SQL queries based on natural language input and database schema context
- **FR-027**: System MUST validate generated SQL using sqlglot before inserting it into the SQL editor
- **FR-028**: System MUST display a validation error with suggested fixes when generated SQL is invalid
- **FR-029**: System MUST display the generated SQL in the SQL editor for user review and modification only after validation passes
- **FR-030**: System MUST allow users to edit the generated SQL before execution
- **FR-031**: System MUST handle OpenAI API errors (rate limits, timeouts, invalid responses) gracefully with clear user-facing error messages

#### User Interface

- **FR-032**: System MUST display query results in a tabular format
- **FR-033**: System MUST support basic table interactions (scrolling, column visibility)
- **FR-034**: System MUST provide clear error messages for all failure scenarios
- **FR-035**: System MUST indicate when results are truncated due to LIMIT

#### Security

- **FR-036**: System MUST NOT require authentication for demo phase
- **FR-037**: System MUST prevent non-SELECT queries from being executed
- **FR-038**: System MUST enforce the configurable LIMIT to prevent excessive data retrieval
- **FR-039**: SQL injection protection is NOT required for this internal tool (trusted users only)
- **FR-040**: System MUST allow all CORS origins (no restrictions)

#### Observability

- **FR-041**: System MUST log at INFO level: connection operations, query executions, and errors
- **FR-042**: System MUST NOT log detailed query parameters or sensitive data (connection URLs with credentials)

### Key Entities

- **Database Connection**: Represents a connection to a user's database. Attributes: connection ID, connection URL (stored in plain text in local SQLite for demo phase), database type, name (user-provided label), metadata (cached schema), status, created timestamp, last refreshed timestamp.

- **Table/View Metadata**: Represents a database table or view. Attributes: name, type (table/view), schema name, columns.

- **Column Metadata**: Represents a column in a table or view. Attributes: name, data type, nullable, default value.

- **Query Result**: Represents the outcome of a SQL query execution. Attributes: column definitions (name, type), row data, total row count, truncated flag (whether LIMIT was applied), execution time.

- **Natural Language Query**: Represents a user's question in plain language. Attributes: query text, generated SQL, database context used, timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully connect to a PostgreSQL database and view schema within 30 seconds
- **SC-002**: 95% of valid SQL SELECT queries execute successfully and display results within 5 seconds
- **SC-003**: 90% of natural language queries generate executable SQL that returns relevant results
- **SC-004**: Users can complete a full workflow (connect → explore schema → execute query) in under 2 minutes on first use
- **SC-005**: System prevents 100% of non-SELECT queries from executing
- **SC-006**: System handles 10 concurrent database connections without performance degradation
- **SC-007**: Error messages are clear enough that users can self-resolve 80% of common issues without documentation

## Assumptions

- **Target Users**: Users have basic knowledge of SQL and database concepts, but may not remember exact schema details
- **Database Access**: Users have valid database credentials and network access to their databases
- **Database Type**: First release only supports PostgreSQL; users with other databases will receive clear error messages
- **Demo Scope**: This is a demo application with no authentication; data is stored locally on the user's machine
- **LLM Access**: Users have access to OpenAI API (GPT-4o) for natural language features
- **Storage**: SQLite is sufficient for demo-level connection and metadata storage
- **Performance**: Queries are expected to return within seconds; optimization for complex analytical queries is out of scope
- **Export**: Query result export (CSV, JSON, etc.) is explicitly out of scope for the demo phase; may be added in future releases
- **Limit Threshold**: Default of 1000 rows is appropriate for demo and exploration; this can be configured
- **UI Language**: All user-facing text (labels, error messages, help text) MUST be in Simplified Chinese; technical identifiers (table/column names) remain as-is from the database
- **Browser Compatibility**: Modern web browsers with JavaScript enabled
- **Database Permissions**: Users have SELECT permissions on the databases they connect to
- **Network**: Users have stable network connectivity to both the application and their databases
