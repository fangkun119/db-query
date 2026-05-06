# Data Model: MySQL Database Support

**Feature**: 002-mysql-support
**Date**: 2026-05-05

## Overview

This document defines the data model changes required to support MySQL databases alongside PostgreSQL. The existing PostgreSQL-specific data models are extended to be database-type aware while maintaining backward compatibility.

---

## Entity: DatabaseConnection

**Location**: `backend/app/db/sqlite.py`

### Current Model (PostgreSQL-only)

```python
class DatabaseConnection(Base):
    """Represents a database connection configuration stored in SQLite."""
    __tablename__ = "database_connections"

    id: Integer (primary_key, auto_increment)
    name: String (unique, nullable=False)
    url: String (nullable=False)
    created_at: DateTime (default CURRENT_TIMESTAMP)
    last_refreshed_at: DateTime (nullable)
    metadata: JSON (nullable)  # Cached metadata
```

### Required Changes

**Add `db_type` field**:
```python
class DatabaseConnection(Base):
    """Represents a database connection configuration stored in SQLite."""
    __tablename__ = "database_connections"

    id: Column(Integer, primary_key=True, autoincrement=True)
    name: Column(String, unique=True, nullable=False)
    url: Column(String, nullable=False)
    db_type: Column(String, nullable=False, default="postgresql")  # NEW
    created_at: Column(DateTime, default=datetime.utcnow)
    last_refreshed_at: Column(DateTime, nullable=True)
    metadata: Column(JSON, nullable=True)
```

**Field Specification**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| `name` | String | UNIQUE, NOT NULL | User-defined connection name |
| `url` | String | NOT NULL | Database connection URL (plaintext password) |
| `db_type` | String | NOT NULL, DEFAULT "postgresql" | Database type: "postgresql" or "mysql" |
| `created_at` | DateTime | DEFAULT NOW() | Connection creation timestamp |
| `last_refreshed_at` | DateTime | NULLABLE | Last metadata refresh timestamp |
| `metadata` | JSON | NULLABLE | Cached table/column metadata |

**Validation Rules**:
- `name`: Must be unique across all connections
- `url`: Must start with `postgresql://`, `postgres://`, or `mysql://`
- `db_type`: Must be "postgresql" or "mysql" (derived from URL scheme)
- `url` + `db_type`: Must be consistent (e.g., mysql:// URL must have db_type="mysql")

**State Transitions**:
```
[New Connection] → [Active] → [Refreshed] → [Deleted]
       ↓             ↓           ↓
   (validation)   (metadata)   (cleanup)
```

---

## Entity: TableMetadata

**Location**: `backend/app/models/metadata.py`

### Current Model (Database-Agnostic - No Changes Needed)

```python
class TableMetadata(BaseModel):
    """Database table or view metadata."""
    schema_name: str
    table_name: str
    table_type: str  # "table" or "view"
    columns: list[ColumnMetadata]
    comment: Optional[str] = None
```

**Compatibility**: Fully compatible with both PostgreSQL and MySQL. No changes required.

**MySQL Value Mapping**:
- `table_type`: MySQL returns "BASE TABLE" → map to "table", "VIEW" → map to "view"
- `schema_name`: Always "dbo" or database name (MySQL doesn't use PostgreSQL-style schemas)

---

## Entity: ColumnMetadata

**Location**: `backend/app/models/metadata.py`

### Current Model (No Changes Needed)

```python
class ColumnMetadata(BaseModel):
    """Database column metadata."""
    name: str
    data_type: str  # String representation, database-specific
    is_nullable: bool
    default_value: Optional[str] = None
    ordinal_position: int
    is_primary_key: bool = False
    comment: Optional[str] = None
```

**Compatibility**: Fully compatible. MySQL data_type values will be MySQL-specific types (VARCHAR, INT, DATETIME, etc.) - this is expected and correct.

---

## Entity: DatabaseSummaryResponse

**Location**: `backend/app/models/database.py`

### Current Model

```python
class DatabaseSummaryResponse(BaseModel):
    """Summary of a database connection."""
    name: str
    db_type: str  # "postgresql" | "mysql"
    table_count: int
    view_count: int
    created_at: datetime
    last_refreshed_at: Optional[datetime] = None
```

### Required Changes

**Add `db_type` field** (currently missing from response model):
```python
class DatabaseSummaryResponse(BaseModel):
    """Summary of a database connection."""
    name: str
    db_type: str  # "postgresql" | "mysql"
    status: str
    table_count: int
    view_count: int
    created_at: datetime
    last_refreshed_at: Optional[datetime] = None
```

**API Response Example**:
```json
{
  "name": "todo_db",
  "dbType": "mysql",
  "tableCount": 18,
  "viewCount": 0,
  "createdAt": "2026-05-05T12:00:00Z",
  "lastRefreshedAt": "2026-05-05T12:05:00Z"
}
```

---

## Entity: DatabaseDetailResponse

**Location**: `backend/app/models/database.py`

### Current Model

```python
class DatabaseDetailResponse(BaseModel):
    """Detailed database connection info with metadata."""
    name: str
    db_type: str  # NEW FIELD
    url: str  # Consider security implications
    tables: list[TableMetadataResponse]
    created_at: datetime
    last_refreshed_at: Optional[datetime] = None
```

### Required Changes

**Add `db_type` field** and update to include metadata:
```python
class DatabaseDetailResponse(BaseModel):
    """Detailed database connection info with metadata."""
    name: str
    db_type: str  # "postgresql" | "mysql"
    tables: list[TableMetadataResponse]
    created_at: datetime
    last_refreshed_at: Optional[datetime] = None
```

---

## Database Schema Migration

### SQLite Migration SQL

```sql
-- Add db_type column to existing table
ALTER TABLE database_connections ADD COLUMN db_type VARCHAR(20) NOT NULL DEFAULT 'postgresql';

-- Update existing rows to match their URL scheme
UPDATE database_connections SET db_type = 'postgresql' WHERE url LIKE 'postgresql://%' OR url LIKE 'postgres://%';
UPDATE database_connections SET db_type = 'mysql' WHERE url LIKE 'mysql://%';

-- Create index for faster lookups by type
CREATE INDEX idx_db_type ON database_connections(db_type);
```

**Note**: For demo phase, manual migration acceptable. Production would use Alembic or similar.

---

## Type Mappings: MySQL → Python

### Common Data Types

| MySQL Type | Python Type | Notes |
|------------|-------------|-------|
| VARCHAR(n) | str | String with max length |
| CHAR(n) | str | Fixed-length string |
| INT / INTEGER | int | 32-bit integer |
| BIGINT | int | 64-bit integer |
| FLOAT / DOUBLE | float | Floating-point |
| DECIMAL / NUMERIC | decimal.Decimal | Exact precision |
| DATE | datetime.date | Date only |
| DATETIME / TIMESTAMP | datetime.datetime | Date and time |
| TEXT | str | Long text |
| BLOB / BINARY | bytes | Binary data |
| JSON | dict / str (MySQL 5.7+) | JSON object or string |
| ENUM | str | Enum value as string |

### Boolean Handling

MySQL doesn't have a native BOOLEAN type (uses TINYINT(1)). Columns defined as BOOL store 0 or 1, but can be queried with TRUE/FALSE literals in SQL.

---

## Relationships

```
DatabaseConnection (1)
    ├── TableMetadata (0..*) [via metadata JSON cache]
    │   └── ColumnMetadata (0..*)
    ├── QueryExecution (0..*) [transient, not persisted]
    └── MetadataRefresh (0..*) [via last_refreshed_at]
```

**Key Design Decisions**:
- No foreign keys in SQLite (demo-grade simplicity)
- Metadata cached as JSON (not normalized tables)
- Query executions are transient (not logged)
- Manual refresh only (no background polling)

---

## Validation Rules

### URL Validation

```python
VALID_SCHEMES = ["postgresql://", "postgres://", "postgresql+asyncpg://", "mysql://", "mysql+aiomysql://"]

def validate_url(url: str) -> tuple[bool, str]:
    if not any(url.startswith(scheme) for scheme in VALID_SCHEMES):
        return False, "Invalid URL scheme. Use postgresql:// or mysql://"
    # Additional validation for host, port, database name can be added
    return True, ""
```

### db_type Validation

```python
VALID_DB_TYPES = ["postgresql", "mysql"]

def validate_db_type(db_type: str) -> bool:
    return db_type in VALID_DB_TYPES
```

---

## Backward Compatibility

**Guarantees**:
1. All existing PostgreSQL connections continue to work
2. No changes to PostgreSQL-specific code paths
3. API responses are extended (not modified)
4. Frontend receives additional `dbType` field (optional in TypeScript for gradual migration)

**Migration Path**:
1. Add db_type column with DEFAULT "postgresql"
2. Update existing rows via one-time migration
3. Deploy code changes
4. Test MySQL functionality
5. Frontend updates (optional, can be gradual)
