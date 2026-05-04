# API Contracts: Database Query Tool

**Date**: 2026-04-27 | **Branch**: `001-db-query-tool`
**Base URL**: `http://localhost:8000/api/v1`

All request/response bodies use JSON. All response property names are CamelCase.

---

## List Database Connections

```
GET /api/v1/dbs
```

**Response** `200 OK`:
```json
[
  {
    "name": "my-postgres",
    "dbType": "postgresql",
    "status": "active",
    "tableCount": 12,
    "viewCount": 3,
    "createdAt": "2026-04-27T10:00:00Z",
    "lastRefreshedAt": "2026-04-27T10:00:05Z"
  }
]
```

---

## Add Database Connection

```
PUT /api/v1/dbs/{name}
```

**Path Parameters**:
| Name | Type | Required | Description |
|---|---|---|---|
| name | string | yes | Connection name (URL-encoded) |

**Request Body**:
```json
{
  "url": "postgresql://user:pass@localhost:5432/mydb"
}
```

**Response** `201 Created`:
```json
{
  "name": "my-postgres",
  "dbType": "postgresql",
  "status": "active",
  "tableCount": 12,
  "viewCount": 3,
  "createdAt": "2026-04-27T10:00:00Z",
  "lastRefreshedAt": "2026-04-27T10:00:05Z"
}
```

**Error Responses**:
- `400 Bad Request` — Invalid URL format or unsupported database type
- `409 Conflict` — Connection name already exists
- `502 Bad Gateway` — Cannot connect to database server
- `504 Gateway Timeout` — Connection timeout (30s)

```json
{ "detail": "无法连接到数据库服务器，请检查网络或数据库状态" }
```

---

## Get Database Detail (with metadata)

```
GET /api/v1/dbs/{name}
```

**Path Parameters**:
| Name | Type | Required | Description |
|---|---|---|---|
| name | string | yes | Connection name (URL-encoded) |

**Response** `200 OK`:
```json
{
  "name": "my-postgres",
  "dbType": "postgresql",
  "status": "active",
  "tables": [
    {
      "schemaName": "public",
      "tableName": "users",
      "tableType": "BASE TABLE",
      "columns": [
        {
          "name": "id",
          "dataType": "integer",
          "isNullable": false,
          "defaultValue": "nextval('users_id_seq'::regclass)"
        },
        {
          "name": "name",
          "dataType": "character varying",
          "isNullable": false,
          "defaultValue": null
        }
      ]
    },
    {
      "schemaName": "public",
      "tableName": "active_orders",
      "tableType": "VIEW",
      "columns": [
        {
          "name": "order_id",
          "dataType": "integer",
          "isNullable": true,
          "defaultValue": null
        }
      ]
    }
  ],
  "createdAt": "2026-04-27T10:00:00Z",
  "lastRefreshedAt": "2026-04-27T10:00:05Z"
}
```

**Error Responses**:
- `404 Not Found` — Connection name does not exist

---

## Delete Database Connection

```
DELETE /api/v1/dbs/{name}
```

**Path Parameters**:
| Name | Type | Required | Description |
|---|---|---|---|
| name | string | yes | Connection name (URL-encoded) |

**Response** `204 No Content`

**Error Responses**:
- `404 Not Found` — Connection name does not exist

---

## Refresh Database Metadata

```
POST /api/v1/dbs/{name}/refresh
```

**Path Parameters**:
| Name | Type | Required | Description |
|---|---|---|---|
| name | string | yes | Connection name (URL-encoded) |

**Response** `200 OK` — Same as `GET /api/v1/dbs/{name}` (returns updated detail)

**Error Responses**:
- `404 Not Found` — Connection name does not exist
- `502 Bad Gateway` — Cannot connect to database
- `504 Gateway Timeout` — Connection timeout

---

## Execute SQL Query

```
POST /api/v1/dbs/{name}/query
```

**Path Parameters**:
| Name | Type | Required | Description |
|---|---|---|---|
| name | string | yes | Connection name (URL-encoded) |

**Request Body**:
```json
{
  "sql": "SELECT * FROM users WHERE name LIKE '%test%'"
}
```

**Response** `200 OK`:
```json
{
  "columnNames": ["id", "name", "email"],
  "rowData": [
    { "id": 1, "name": "test_user", "email": "test@example.com" },
    { "id": 2, "name": "test_admin", "email": "admin@example.com" }
  ],
  "totalCount": 2,
  "isTruncated": false,
  "executionTimeMs": 45.2
}
```

When LIMIT is auto-applied (`isTruncated: true`):
```json
{
  "columnNames": ["id", "name"],
  "rowData": [ "... 1000 rows ..." ],
  "totalCount": 1000,
  "isTruncated": true,
  "executionTimeMs": 230.5
}
```

**Error Responses**:
- `400 Bad Request` — SQL syntax error or non-SELECT statement
- `404 Not Found` — Connection name does not exist
- `502 Bad Gateway` — Database connection failure

```json
{ "detail": "仅支持 SELECT 查询" }
```

```json
{ "detail": "语法错误 (行 1, 列 15): Expected table name" }
```

---

## Natural Language to SQL

```
POST /api/v1/dbs/{name}/query/natural
```

**Path Parameters**:
| Name | Type | Required | Description |
|---|---|---|---|
| name | string | yes | Connection name (URL-encoded) |

**Request Body**:
```json
{
  "prompt": "显示所有用户的订单数量"
}
```

**Response** `200 OK`:
```json
{
  "sql": "SELECT u.id, u.name, COUNT(o.id) AS order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id, u.name",
  "explanation": "查询所有用户及其订单数量，使用 LEFT JOIN 确保没有订单的用户也会显示"
}
```

**Error Responses**:
- `400 Bad Request` — Generated SQL fails validation
- `404 Not Found` — Connection name does not exist
- `502 Bad Gateway` — OpenAI API error

```json
{ "detail": "OpenAI API 密钥无效，请检查配置" }
```

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "detail": "Human-readable error message in Chinese"
}
```

HTTP status codes used:
| Code | Meaning |
|---|---|
| 400 | Invalid input (bad SQL, unsupported DB, validation error) |
| 404 | Resource not found |
| 409 | Conflict (duplicate name) |
| 500 | Internal server error |
| 502 | Upstream connection failure (database or OpenAI) |
| 504 | Connection timeout |
