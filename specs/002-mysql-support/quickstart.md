# Quickstart: MySQL Database Support

**Feature**: 002-mysql-support
**Date**: 2026-05-05

## Overview

This guide demonstrates how to use the MySQL database support feature. It covers setup, connection, querying, and natural language to SQL conversion for MySQL databases.

---

## Prerequisites

### Software Requirements

- **Python**: 3.14+ (from pyproject.toml)
- **MySQL**: 5.7+ or 8.0+ server
- **Node.js**: 18+ (for frontend development)

### Python Dependencies

```bash
cd backend
uv sync --extra pymysql --extra aiomysql
```

Or add to `pyproject.toml`:
```toml
dependencies = [
    # ... existing
    "pymysql>=1.0.0",
    "aiomysql>=0.2.0",
]
```

### MySQL Test Database

```bash
# Create test database
mysql -u root -p < test/db_scripts/mysql/todo_db.sql

# Verify connection
mysql -u todo_db -ptodo_tb -h localhost todo_db -e "SHOW TABLES;"
```

Expected output:
```
+-------------------------+
| Tables_in_todo_db       |
+-------------------------+
| activity_logs            |
| attachments              |
| checklist_items          |
| checklists               |
| labels                   |
| notifications            |
| organizations            |
| project_members          |
| projects                 |
| reminder                 |
| sprints                  |
| task_comments            |
| task_dependencies        |
| task_history             |
| task_labels              |
| tasks                    |
| time_entries             |
| users                    |
+-------------------------+
```

---

## Quick Start: 5 Minutes to MySQL Queries

### Step 1: Start Backend Server

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

Verify:
```bash
curl http://localhost:8000/
# Response: {"status":"healthy"}
```

### Step 2: Add MySQL Database Connection

```bash
curl -X PUT http://localhost:8000/api/v1/databases/todo_db \
  -H "Content-Type: application/json" \
  -d '{
    "url": "mysql://todo_db:todo_tb@localhost:3306/todo_db"
  }'
```

Response:
```json
{
  "name": "todo_db",
  "dbType": "mysql",
  "status": "active",
  "tableCount": 18,
  "viewCount": 0,
  "createdAt": "2026-05-05T12:00:00Z",
  "lastRefreshedAt": "2026-05-05T12:00:00Z"
}
```

### Step 3: Verify Database Appears in List

```bash
curl http://localhost:8000/api/v1/databases
```

Response should show both databases:
```json
[
  {
    "name": "interview_db",
    "dbType": "postgresql",
    "status": "active",
    "tableCount": 23,
    "viewCount": 2,
    "createdAt": "2026-04-01T10:00:00Z",
    "lastRefreshedAt": "2026-05-01T15:30:00Z"
  },
  {
    "name": "todo_db",
    "dbType": "mysql",
    "status": "active",
    "tableCount": 18,
    "viewCount": 0,
    "createdAt": "2026-05-05T12:00:00Z",
    "lastRefreshedAt": "2026-05-05T12:00:00Z"
  }
]
```

### Step 4: Query MySQL Database

```bash
curl -X POST http://localhost:8000/api/v1/databases/todo_db/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM tasks LIMIT 5"
  }'
```

Response:
```json
{
  "columns": ["id", "project_id", "title", "status", "priority", "task_type"],
  "rows": [
    [1, 1, "Epic: Critical task", "backlog", "critical", "epic"],
    [2, 1, "Task: Low priority", "backlog", "low", "task"],
    [3, 1, "Task: High priority", "in_progress", "high", "task"],
    [4, 1, "Story: Low priority", "archived", "low", "story"],
    [5, 1, "Story: Medium", "done", "medium", "story"]
  ],
  "rowCount": 5,
  "limitApplied": false,
  "limitMessage": null
}
```

### Step 5: Natural Language to MySQL SQL

```bash
curl -X POST http://localhost:8000/api/v1/databases/todo_db/query/natural \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show me the top 10 tasks by priority"
  }'
```

Response (MySQL-specific syntax):
```json
{
  "sql": "SELECT * FROM tasks ORDER BY priority DESC LIMIT 10",
  "explanation": "Retrieves top 10 tasks ordered by priority in descending order"
}
```

---

## Common Operations

### Connection URL Formats

**Basic MySQL**:
```
mysql://user:password@localhost:3306/database
```

**MySQL with custom port**:
```
mysql://user:password@localhost:3307/database
```

**MySQL with remote host**:
```
mysql://user:password@192.168.1.100:3306/database
```

**MySQL with SSL parameters**:
```
mysql://user:password@host:3306/database?ssl_ca=/path/to/ca.pem
```

### MySQL-Specific Queries

**String Concatenation** (MySQL uses CONCAT):
```sql
SELECT CONCAT(first_name, ' ', last_name) as full_name FROM users
```

**Case-Insensitive Search** (MySQL LIKE):
```sql
SELECT * FROM tasks WHERE title LIKE '%bug%'
```

**Reserved Keywords** (use backticks):
```sql
SELECT `key`, `order`, `group` FROM tasks
```

**Current Date/Time**:
```sql
SELECT CURDATE() as today, NOW() as current_time
```

### Switching Between PostgreSQL and MySQL

```bash
# Query PostgreSQL
curl -X POST http://localhost:8000/api/v1/databases/interview_db/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM candidates LIMIT 5"}'

# Query MySQL
curl -X POST http://localhost:8000/api/v1/databases/todo_db/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM tasks LIMIT 5"}'
```

Both use the same API endpoints; the system routes queries based on `db_type`.

---

## Troubleshooting

### Connection Errors

**Error**: "Failed to connect to database server: Can't connect to MySQL server"

**Solutions**:
1. Verify MySQL is running: `mysql -u root -p -e "SELECT 1"`
2. Check host/port: `telnet localhost 3306`
3. Verify credentials: `mysql -u todo_db -ptodo_tb -h localhost todo_db`
4. Check firewall settings

### Metadata Extraction Errors

**Error**: "Permission denied for table information_schema"

**Solution**: Grant permissions:
```sql
GRANT SELECT ON information_schema.* TO 'todo_db'@'localhost';
FLUSH PRIVILEGES;
```

### Query Errors

**Error**: "You have an error in your SQL syntax"

**Solutions**:
1. Check for reserved keywords (use backticks): `SELECT \`key\` FROM table`
2. Verify string literals use single quotes: `WHERE name = 'value'`
3. Check function names: MySQL uses `CONCAT()`, not `||`

### NL to SQL Issues

**Problem**: Generated SQL uses wrong syntax for MySQL

**Solutions**:
1. Verify `db_type` is correctly stored (check GET /api/v1/databases/{name})
2. Clear cached metadata: `POST /api/v1/databases/{name}/refresh`
3. Check system prompt includes MySQL-specific instructions

---

## MySQL Error Reference

### Common MySQL Error Messages

#### Connection Errors

**Error**: `Can't connect to MySQL server on 'localhost:3306'`
```
Cause: MySQL server not running or wrong port
Solution:
  1. Start MySQL: brew services start mysql
  2. Check port: mysql -u root -p -e "SHOW VARIABLES LIKE 'port'"
  3. Verify network: telnet localhost 3306
```

**Error**: `Access denied for user 'todo_db'@'localhost'`
```
Cause: Wrong username, password, or user doesn't exist
Solution:
  1. Verify credentials: mysql -u todo_db -ptodo_tb -h localhost todo_db
  2. Create user if needed:
     CREATE USER 'todo_db'@'localhost' IDENTIFIED BY 'todo_tb';
     GRANT ALL PRIVILEGES ON todo_db.* TO 'todo_db'@'localhost';
```

**Error**: `Unknown database 'todo_db'`
```
Cause: Database doesn't exist
Solution:
  1. List databases: SHOW DATABASES;
  2. Create database: CREATE DATABASE todo_db;
  3. Import schema: mysql -u root -p < todo_db.sql
```

#### Query Syntax Errors

**Error**: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'SELCT * FROM tasks' at line 1`
```
Cause: Typo in SQL keyword
Solution: Change SELCT to SELECT
```

**Error**: `Unknown column 'key' in 'field list'`
```
Cause: 'key' is a reserved keyword in MySQL
Solution: Use backticks: SELECT `key` FROM table
```

**Error**: `FUNCTION schema.CONCAT does not exist`
```
Cause: CONCAT function syntax error
Solution: Use CONCAT(a, b, c) with proper arguments
```

**Error**: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '|| ' text' at line 1`
```
Cause: Using PostgreSQL || operator in MySQL
Solution: Use CONCAT(a, b) instead of a || b
```

#### Metadata Errors

**Error**: `SELECT command denied to user 'todo_db'@'localhost' for table 'information_schema.tables'`
```
Cause: User lacks information_schema permissions
Solution:
  GRANT SELECT ON information_schema.* TO 'todo_db'@'localhost';
  FLUSH PRIVILEGES;
```

**Error**: `Table 'todo_db.information_schema.tables' doesn't exist`
```
Cause: Wrong database selected or MySQL version too old
Solution:
  1. Verify database: USE todo_db;
  2. Check MySQL version: SELECT VERSION();
  3. Ensure MySQL 5.0+ (information_schema added in 5.0)
```

#### Data Type Errors

**Error**: `Incorrect datetime value: '2026-05-05' for column 'due_date' at row 1`
```
Cause: Date string format issue
Solution: Use proper format: '2026-05-05' or CAST('2026-05-05' AS DATE)
```

**Error**: `Data truncated for column 'status' at row 1`
```
Cause: Value doesn't fit in ENUM definition
Solution: Check valid ENUM values: SHOW COLUMNS FROM tasks LIKE 'status'
```

### API Error Response Format

**Connection Failed (400 Bad Request)**:
```json
{
  "detail": "Failed to connect to database server: Access denied for user 'todo_db'@'localhost'"
}
```

**Invalid SQL (400 Bad Request)**:
```json
{
  "detail": "SQL validation failed: Only SELECT statements are allowed"
}
```

**Query Execution Failed (400 Bad Request)**:
```json
{
  "detail": "Query execution failed: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use"
}
```

**Metadata Extraction Failed (500 Internal Server Error)**:
```json
{
  "detail": "Failed to extract metadata: Permission denied for table 'information_schema.tables'"
}
```

### Debugging Tips

1. **Enable Query Logging**: Check backend logs for exact SQL sent to MySQL
2. **Test in MySQL Client First**: Verify query works in `mysql -u todo_db -ptodo_tb todo_db`
3. **Check Database Type**: Ensure `db_type` is "mysql" not "postgresql"
4. **Verify URL Format**: Must start with `mysql://` (not `postgresql://`)
5. **Refresh Metadata**: If schema changed, run refresh to update cached metadata

---

## REST Client Testing

### Using VSCode REST Client

1. Open `test/rest/mysql.rest` (after creation)
2. Click "Send Request" above each test
3. Verify responses match expected output

### Example Test Suite Structure

```http
@baseUrl = http://localhost:8000/api/v1
@mysqlUrl = mysql://todo_db:todo_tb@localhost:3306/todo_db

### 1. Add MySQL Database
PUT {{baseUrl}}/databases/todo_db
Content-Type: application/json

{
  "url": "{{mysqlUrl}}"
}

### 2. List Databases (should show dbType)
GET {{baseUrl}}/databases

### 3. Query MySQL Tasks
POST {{baseUrl}}/databases/todo_db/query
Content-Type: application/json

{
  "sql": "SELECT * FROM tasks LIMIT 5"
}

### 4. MySQL-Specific Query (CONCAT)
POST {{baseUrl}}/databases/todo_db/query
Content-Type: application/json

{
  "sql": "SELECT CONCAT(title, ' - ', status) as task_summary FROM tasks LIMIT 3"
}

### 5. Natural Language Query
POST {{baseUrl}}/databases/todo_db/query/natural
Content-Type: application/json

{
  "prompt": "Show me high priority tasks in progress"
}
```

---

## Frontend Usage

### UI Overview

The frontend displays database connections with visual indicators for database types. When you have both PostgreSQL and MySQL databases, you can easily distinguish them by color-coded badges.

**Database List Display**:
- **PostgreSQL databases**: Blue badge with "POSTGRESQL" text
- **MySQL databases**: Orange badge with "MYSQL" text
- Each database card shows: name, type badge, status, table/view counts, last refreshed time

### Adding MySQL Connection in UI

1. Navigate to the **Database Management** page (usually at `/databases` route)
2. Click the **"Add Database"** button (top-right of the page)
3. Fill in the connection form:
   - **Name**: `todo_db` (or your preferred name)
   - **URL**: `mysql://todo_db:todo_tb@localhost:3306/todo_db`
   - **Note**: The URL must start with `mysql://` scheme
4. Click **"Save"** to create the connection

**Expected UI Feedback**:
- Success: Database appears in the list with orange "MYSQL" badge
- Loading state shows during metadata extraction (may take 10-30 seconds)
- Success notification: "Database connected successfully"
- Error: Alert box with specific error message (connection timeout, invalid credentials, etc.)

### Database Type Badge Display

**Visual Design**:
```
┌─────────────────────────────────────────────┐
│ 🗄️ todo_db          [MYSQL]    Active        │
│ Tables: 18 | Views: 0 | Last refreshed: 2m  │
│ [Refresh]  [Query]  [Delete]                 │
└─────────────────────────────────────────────┘
```

**Badge Color Scheme**:
- PostgreSQL: Blue background (`#1890ff`)
- MySQL: Orange background (`#fa8c16`)

### Viewing Metadata

1. Click on the `todo_db` card in the database list
2. The page expands to show:
   - **Tables List**: All tables with column counts
   - **Columns Detail**: For each table, shows column names, data types, nullable status
   - **Metadata Summary**: Total tables, total views, extraction timestamp

**MySQL Metadata Notes**:
- Table comments may be `NULL` or empty (MySQL limitation in demo phase)
- Column comments are displayed when available
- Schema name is typically the database name (different from PostgreSQL's schema pattern)

### Executing Queries

**SQL Editor Interface**:
1. Select the `todo_db` database by clicking on it
2. The **SQL Editor** panel appears with Monaco Editor (syntax highlighting)
3. Enter your MySQL query:
   ```sql
   SELECT id, title, status, priority 
   FROM tasks 
   WHERE status = 'in_progress' 
   ORDER BY priority DESC 
   LIMIT 10
   ```
4. Click **"Run Query"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
5. Results appear in a table below the editor

**Result Table Features**:
- **Column headers**: Display column names from your query
- **Row data**: Tabular format with sortable columns
- **Limit notification**: If auto-LIMIT applied, shows "仅显示前 1000 行"
- **MySQL errors**: Displayed in red below the editor if query fails
- **Export options**: Download results as CSV (if implemented)

### Natural Language Queries

**Natural Language Input Panel**:
1. Select the `todo_db` database
2. Find the **"Natural Language"** input tab (next to SQL editor)
3. Enter your question in plain English:
   ```
   Show me the top 10 tasks by estimated hours
   ```
4. Click **"Generate SQL"** button
5. Review the generated MySQL query in the SQL editor
6. Click **"Run Query"** to execute

**MySQL-Specific Generation Examples**:

| Your Input | Generated MySQL SQL |
|-------------|---------------------|
| "Tasks with high priority" | `SELECT * FROM tasks WHERE priority = 'high'` |
| "Concatenate title and status" | `SELECT CONCAT(title, ' - ', status) FROM tasks` |
| "Tasks created this week" | `SELECT * FROM tasks WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)` |
| "Case-insensitive search for 'bug'" | `SELECT * FROM tasks WHERE title LIKE '%bug%'` |

**Tips for Better Results**:
- Be specific about table names (e.g., "from the tasks table")
- Mention filters clearly (e.g., "where status is in_progress")
- Use "top N" for LIMIT queries (e.g., "top 10 users")
- Specify sort order (e.g., "ordered by created_at desc")

### Error Messages in UI

**MySQL Connection Errors** (displayed in alert banner):
```
⚠️ Connection Failed
Failed to connect to database server: Access denied for user 'todo_db'@'localhost'
Check your username, password, and database permissions.
```

**MySQL Query Errors** (displayed below SQL editor):
```
❌ Query Error
You have an error in your SQL syntax; check the manual that corresponds
to your MySQL server version for the right syntax to use near 'SELCT' at line 1
```

**Validation Errors** (displayed inline):
```
⚠️ Invalid URL Scheme
Connection URL must start with mysql:// or postgresql://
```

### Switching Between Databases

**Multi-Database Workflow**:
1. Both PostgreSQL and MySQL databases appear in your database list
2. Click any database card to switch context
3. The SQL editor and Natural Language input automatically adapt to the selected database type
4. No need to refresh or reconnect - switching is instant

**Example Session**:
```
1. Query PostgreSQL (interview_db)
   → PostgreSQL SQL syntax generated
   → Uses PostgreSQL functions (||, ILIKE, etc.)

2. Switch to MySQL (todo_db)
   → MySQL SQL syntax generated
   → Uses MySQL functions (CONCAT, LIKE, etc.)
```

### Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Run Query | `Ctrl+Enter` / `Cmd+Enter` | Execute current SQL |
| Generate SQL | `Ctrl+G` / `Cmd+G` | Generate from natural language |
| Clear Editor | `Ctrl+L` / `Cmd+L` | Clear SQL editor |
| Format SQL | `Ctrl+Shift+F` | Format SQL (if implemented) |

---

## Development Workflow

### Backend Development

```bash
# 1. Install dependencies
cd backend
uv sync --extra pymysql --extra aiomysql

# 2. Run tests
uv run pytest tests/ -v

# 3. Start development server
uv run uvicorn app.main:app --reload --port 8000

# 4. Test with REST Client
# Open test/rest/mysql.rest in VSCode
```

### Frontend Development

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Start development server
npm run dev

# 3. Open browser
# Navigate to http://localhost:5173
```

### Testing Workflow

```bash
# Backend tests
cd backend
uv run pytest tests/test_metadata.py -v  # Metadata extraction tests
uv run pytest tests/test_query.py -v      # Query execution tests

# Frontend tests
cd frontend
npm run test                              # Vitest unit tests
npm run test:e2e                          # Playwright E2E tests
```

---

## Next Steps

After completing this quickstart:

1. **Explore**: Test various MySQL queries and natural language inputs
2. **Customize**: Adjust UI to display database type badges
3. **Extend**: Add more MySQL-specific features as needed
4. **Test**: Run full REST client test suite in `test/rest/mysql.rest`

For detailed implementation guidance, see:
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/api.md)
- [Research Findings](./research.md)
