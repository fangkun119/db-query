# Feature Specification: MySQL Database Support

**Feature Branch**: `004-mysql-support`
**Created**: 2025-05-05
**Status**: Draft
**Input**: User description: "1. 目前项目只支持 PostgreSQL 一种数据库，需要升级，让现有各项功能也支持 MySQL 数据库。 具体来说：1.1 在添加和删除数据库功能中，支持MySQL类型的数据库 1.2 在MySQL数据库的 Metadata 的提取和查询，支持MySQL类型的数据库，示在前端界面的数据库类型标识中，支持MySQL 1.3 在前端的SQL输入框中，用户输入MySQL类型的语句，同样能够传给后端并进行查询（不需要检查SQL类型，直接传给后端，如果后端数据库报错，直接把错误信息展示在界面上即可） 1.4 在前端的自然语言输入框中，对于用户输入的自然语言，能够根据数据库类型的不同，生成对应的SQL语法，例如如果数据库类型是MySQL，则生成符合MySQL语法的SQL"

## User Scenarios & Testing

### User Story 1 - Add MySQL Database Connection (Priority: P1)

As a data analyst, I want to add a MySQL database connection to the system so that I can query and analyze data stored in MySQL databases alongside my PostgreSQL databases.

**Why this priority**: This is the foundational capability - without the ability to connect to MySQL databases, no other MySQL-related features can function. This is the minimum viable feature for MySQL support.

**Independent Test**: Can be fully tested by adding a MySQL database connection URL and verifying the database appears in the database list with correct type标识.

**Acceptance Scenarios**:

1. **Given** I am on the database management page, **When** I enter a valid MySQL connection URL (e.g., `mysql://user:pass@host:port/db`), **Then** the system successfully adds the database and displays it in the database list
2. **Given** I enter an invalid MySQL connection URL, **When** I submit the form, **Then** the system displays a clear error message indicating the connection failed
3. **Given** I have both PostgreSQL and MySQL databases, **When** I view the database list, **Then** each database shows its correct type标识 (PostgreSQL or MySQL)
4. **Given** I want to delete a MySQL database, **When** I click the delete button on a MySQL database entry, **Then** the database is removed from the system and its metadata is cleared

---

### User Story 2 - Query MySQL Database with SQL (Priority: P2)

As a data analyst, I want to write and execute MySQL-specific SQL queries directly so that I can use MySQL syntax features like LIMIT, specific functions, and table references.

**Why this priority**: This enables users to actually work with their MySQL data after connecting. It's the core value proposition - being able to query the data.

**Independent Test**: Can be fully tested by connecting to a MySQL database, writing a MySQL-specific query (e.g., using MySQL-specific functions or LIMIT clause), executing it, and viewing the results.

**Acceptance Scenarios**:

1. **Given** I have added a MySQL database, **When** I enter a MySQL SELECT query in the SQL editor and execute it, **Then** the system sends the query to the MySQL database and displays the results in a table
2. **Given** I enter MySQL-specific syntax (e.g., `LIMIT 10` instead of `LIMIT 10` at end, or MySQL functions like `NOW()`, `CONCAT()`), **When** I execute the query, **Then** the query is passed directly to MySQL without syntax validation and results or error messages are displayed
3. **Given** my MySQL query has a syntax error, **When** I execute it, **Then** the MySQL database error message is displayed clearly in the interface
4. **Given** my query would return many rows, **When** I execute it without a LIMIT clause, **Then** the system automatically adds a LIMIT clause (using MySQL syntax) and notifies me that only the first N rows are displayed

---

### User Story 3 - Generate MySQL SQL from Natural Language (Priority: P3)

As a data analyst who is not an SQL expert, I want to describe my data needs in plain language and have the system generate MySQL-compatible SQL queries automatically.

**Why this priority**: This is a convenience feature that improves usability but is not essential - users who know SQL can use User Story 2 to query MySQL databases directly.

**Independent Test**: Can be fully tested by connecting to a MySQL database, entering a natural language query, and verifying the generated SQL uses MySQL-specific syntax and executes successfully.

**Acceptance Scenarios**:

1. **Given** I am working with a MySQL database, **When** I enter a natural language query like "show me the top 10 users by registration date", **Then** the generated SQL uses MySQL-compatible syntax (e.g., `LIMIT 10` at the end, proper date functions)
2. **Given** I am working with a PostgreSQL database, **When** I enter the same natural language query, **Then** the generated SQL uses PostgreSQL-compatible syntax (e.g., different date functions, LIMIT placement)
3. **Given** the natural language is ambiguous or unclear, **When** the system generates SQL, **Then** it produces a reasonable best-effort query that I can then modify manually if needed
4. **Given** I switch between a MySQL and PostgreSQL database, **When** I use natural language query on each, **Then** the generated SQL syntax adapts to the current database type

---

### Edge Cases

- What happens when a user enters a PostgreSQL connection URL but the system detects it as MySQL, or vice versa?
- How does the system handle MySQL connection strings with different formats (e.g., with/without port, with SSL parameters, using `127.0.0.1` vs `localhost`)?
- What happens when the MySQL database has tables or column names that are MySQL reserved keywords (like `key`, `order`, `group`)?
- How does the system behave when querying a MySQL database that returns binary data (BLOB, BINARY) or JSON columns?
- What happens if the user writes SQL that mixes PostgreSQL and MySQL syntax when connected to MySQL?
- How does the system handle connection timeouts or network issues when connecting to remote MySQL databases?
- What happens when the MySQL database version is very old (5.x) vs very new (8.x) and syntax features differ?
- What happens when a user tries to add a MySQL database with the same name as an existing PostgreSQL database?

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to add MySQL database connections via connection URL in the standard format `mysql://[user[:password]@][host][:port][/database]`
- **FR-002**: System MUST detect and store the database type (PostgreSQL or MySQL) automatically from the connection URL scheme
- **FR-003**: System MUST display the database type标识 (PostgreSQL or MySQL) for each database in the database list UI
- **FR-004**: System MUST support deletion of MySQL database connections, including cleanup of all associated metadata from the local storage
- **FR-005**: System MUST extract and store metadata from MySQL databases including tables, views, columns, data types, and constraints (both TABLE and VIEW object types are included in schema extraction)
- **FR-005a**: System MUST provide a manual refresh option for users to update metadata when database schemas change
- **FR-006**: System MUST query MySQL `information_schema` system tables to obtain MySQL database metadata
- **FR-007**: System MUST execute SQL queries directly on MySQL databases without performing SQL syntax validation or type checking
- **FR-008**: System MUST display MySQL database error messages directly and accurately to users when queries fail
- **FR-009**: System MUST automatically append `LIMIT N` clause with MySQL-compatible syntax to SELECT queries that lack a LIMIT clause
- **FR-010**: System MUST notify users when result sets are truncated due to automatic LIMIT addition, showing "仅显示前 N 行" message
- **FR-011**: System MUST generate MySQL-specific SQL syntax when using natural language query feature on MySQL databases
- **FR-012**: System MUST include MySQL-specific table and column metadata as context when generating SQL from natural language for MySQL databases
- **FR-013**: System MUST store database type persistently in the local storage so that subsequent connections remember whether it's PostgreSQL or MySQL
- **FR-014**: System MUST support both PostgreSQL and MySQL databases simultaneously in the same session without conflicts or interference
- **FR-015**: System MUST handle MySQL connection URL format variations including optional port specification, SSL parameters, and different host formats

### Key Entities

- **Database Connection**: Represents a connection to a database, containing connection URL, database type (PostgreSQL/MySQL), display name, and extracted metadata. The database type determines query syntax and metadata extraction strategy.
- **Database Metadata**: Schema information including tables, views, columns, data types, constraints, indexes, and relationships. The structure and extraction method differs between PostgreSQL (querying `pg_catalog`, `information_schema`) and MySQL (querying `information_schema`).
- **Query Execution**: Represents a query execution attempt, containing the SQL text, database reference, execution status, result set, and any error messages. The error messages and result handling adapt based on database type.
- **Database Type Identifier**: Enumeration or flag indicating PostgreSQL or MySQL, displayed in the UI and used throughout the system to determine metadata extraction strategy, SQL syntax validation behavior (or lack thereof), and natural language to SQL generation approach.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can successfully add a MySQL database connection and see it appear in the database list with correct type标识 within 10 seconds of submission
- **SC-002**: MySQL database metadata is extracted and displayed with 100% accuracy for all accessible tables and columns when a database is added or refreshed; metadata extraction completes within 30 seconds for databases with up to 25 tables (timeout prevents longer waits)
- **SC-003**: Users can execute MySQL SELECT queries and see results formatted in a table within 3 seconds for queries returning up to 100 rows
- **SC-004**: Natural language queries for MySQL databases generate syntactically correct MySQL SQL in at least 90% of common query patterns including simple filtering, sorting, top-N queries, and basic joins
- **SC-005**: The system supports storing at least 10 database connection configurations (mix of PostgreSQL and MySQL) with no enforced limit on quantity; actual database queries use transient connections (established per query, released immediately) via NullPool pattern, avoiding long-term connection pool occupation
- **SC-006**: Error messages from failed MySQL queries are displayed clearly and accurately to help users diagnose issues, preserving the original MySQL error format
- **SC-007**: Users can successfully switch between querying PostgreSQL and MySQL databases in the same session within 2 seconds without page refresh or manual reconnection

## Clarifications

### Session 2025-05-05

- Q: How should database passwords be stored in the local SQLite database? → A: Store plaintext (as-is in URL)
- Q: SC-005 "10 concurrent connections" - per user or system-wide? → A: Connections are SQLite-stored configuration records only, not real DB connections; uses NullPool (connect per query, release immediately); unlimited quantity supported
- Q: Which Python MySQL client library? → A: Pure Python (pymysql) for portability and zero native dependencies
- Q: When should database metadata be refreshed? → A: Manual refresh only (user triggered via button)
- Q: Should metadata extraction include database VIEWs? → A: Yes, include views alongside tables

## Assumptions

- MySQL database connection follows standard URL format: `mysql://[user[:password]@][host][:port][/database][?options]`
- Users have valid MySQL credentials and necessary permissions (SELECT, SHOW DATABASES, access to information_schema) to connect to their MySQL databases
- MySQL databases are accessible from the application server with proper network connectivity, firewall rules, and any required SSL certificates
- MySQL version is 5.7 or higher; older versions (5.5, 5.6) may have limited compatibility with metadata extraction
- The application uses `pymysql` as the MySQL client library for its pure Python implementation, requiring no system-level compilation or native dependencies, ensuring consistent behavior across platforms
- Users understand basic database concepts and can provide connection details including host, port, username, password, and database name
- MySQL-specific SQL syntax differences from PostgreSQL (string escaping, identifier quoting, function names, LIMIT syntax) are handled at query generation time, not at query execution time
- SQLite local storage continues to work for storing database connections and metadata for both PostgreSQL and MySQL databases
- The existing PostgreSQL functionality remains unchanged and fully functional - this is additive, not a replacement
- MySQL metadata can be obtained using standard `information_schema` queries which are available in MySQL 5.0 and later
- The system does not need to automatically detect database type from connection attempts - the URL scheme (`mysql://` vs `postgresql://` or `postgres://`) is sufficient
- Users understand that MySQL and PostgreSQL have different SQL dialects and that SQL written for one may not work on the other
- Database passwords are stored in plaintext within connection URLs in the local SQLite storage; this is acceptable for demo/prototype phase where the application runs on trusted user devices
- Database connections use a NullPool pattern: each query establishes a transient connection to the database and releases it immediately after the query completes, avoiding long-term connection pool occupation and supporting unlimited stored connection configurations
- Metadata refresh is manual only: users trigger refresh when they know the database schema has changed; no automatic polling or background refresh to avoid complexity and performance overhead
