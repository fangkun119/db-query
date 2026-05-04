<!--
Version change: (initial) → 1.0.0
Rationale: Initial constitution establishment for db-query demo project

Modified principles: N/A (initial creation)

Added sections:
- Core Principles (3 principles)
- Technical Constraints (4 constraints)
- Governance (2 rules)

Removed sections: N/A

Templates requiring updates:
- ✅ plan-template.md - Constitution Check section verified compatible
- ✅ spec-template.md - No principle-specific references to update
- ✅ tasks-template.md - Task categorization verified compatible
- ✅ checklist-template.md - No constitution references to update

Follow-up TODOs: None
-->

# DB-Query Constitution

## Core Principles

### I. Demo-First Access

**Principle**: During the demo phase, no authentication is required. All users can access the system freely.

**Rationale**: This is a demo project focused on rapid development and user feedback. Removing authentication barriers allows faster iteration and easier testing.

---

### II. Python Ergonomics

**Principle**: Backend code MUST follow ergonomic Python patterns, emphasizing readability and maintainability.

**Rationale**: Python's strength lies in its readability. Ergonomic patterns ensure the codebase remains approachable and maintainable, especially important for a demo that may evolve into a production system.

---

### III. Type Safety Frontend

**Principle**: Frontend code MUST use TypeScript with strict type checking. Type-safe solutions are always preferred over alternatives.

**Rationale**: Type safety catches errors at compile time rather than runtime, reducing bugs and improving maintainability. For a demo that may scale, this foundation is critical.

---

## Technical Constraints

### Backend Stack

- **Language**: Python with UV package manager
- **Style**: Ergonomic Python - idiomatic, readable, maintainable code
- **Data Modeling**: ALL core data structures MUST be defined via Pydantic models. Scattered dictionaries are prohibited.

**Rationale**: Pydantic provides validation, serialization, and type safety in one package. Banning scattered dictionaries ensures consistent data modeling throughout the backend.

---

### Frontend Stack

- **Language**: TypeScript (strict mode)
- **Style**: Prioritize type-safe and maintainable solutions
- **API Integration**: Frontend request/response structures MUST strictly align with backend contracts

**Rationale**: Strict alignment between frontend and backend contracts prevents type mismatches and reduces integration bugs.

---

### API Contract Standards

- **JSON Format**: ALL backend responses to frontend MUST use CamelCase property names
- **Contract Alignment**: Frontend input/output structures MUST strictly match backend Pydantic model definitions

**Rationale**: CamelCase is the JavaScript/TypeScript convention, while Python typically uses snake_case. This standard creates a clear contract boundary: backend uses snake_case internally, exports CamelCase to frontend.

---

## Governance

### Amendment Policy

- This is a **demo project**. Principles may be adjusted at any time as project needs evolve.
- When principles change, update this constitution and increment the version number.

**Rationale**: Demo projects require flexibility. The constitution should guide, not constrain, rapid iteration.

---

### Code Review Priority

When reviewing code or changes, prioritize in this order:

1. **Security and Correctness** - Is the code safe? Does it work as specified?
2. **Performance** - Is it performant enough for demo purposes?
3. **Code Style** - Does it follow project conventions?

**Rationale**: For a demo, correctness and safety are non-negotiable. Performance matters but can be optimized later. Style is important but should not block progress.

---
=======
Sync Impact Report:
- Version change: [INITIAL] → 1.0.0
- Modified principles: N/A (initial version)
- Added sections: All sections (initial constitution)
- Removed sections: N/A
- Templates requiring updates:
  - ✅ plan-template.md (Constitution Check section compatible)
  - ✅ spec-template.md (no constitution-specific references)
  - ✅ tasks-template.md (task categorization aligned with principles)
- Follow-up TODOs: None
-->

# Database Query Tool Constitution

## Core Principles

### I. PostgreSQL-First Database Support

**Principle**: The system MUST prioritize PostgreSQL support while maintaining extensibility for future database types.

- PostgreSQL is the primary supported database type for version 1.0
- Metadata extraction MUST use PostgreSQL-specific system catalog queries
- Architecture MUST include extension points for additional database types (MySQL, etc.)
- No generic database abstraction layer in initial version
- Database-specific logic MUST be isolated for future extraction

**Rationale**: Focusing on PostgreSQL ensures robust implementation rather than shallow multi-database support. Extension points allow future database types without premature abstraction.

### II. SQL Validation and Safety

**Principle**: All user-provided SQL MUST be validated for syntax correctness and restricted to read-only operations.

- Every SQL query MUST be parsed using sqlglot before execution
- Only SELECT statements are permitted; INSERT/UPDATE/DELETE/ALTER/DROP MUST be rejected
- Syntax errors MUST return clear, actionable error messages to users
- Queries without explicit LIMIT clauses MUST automatically have LIMIT 1000 appended
- Default limit MUST be user-configurable
- Results from auto-limited queries MUST include notification "仅显示前 1000 行"

**Rationale**: Prevents accidental or malicious data modification while maintaining usability. Auto-limiting protects against large result sets that could degrade performance.

### III. LLM-Assisted Query Generation with Context

**Principle**: Natural language to SQL conversion MUST be grounded in actual database schema metadata.

- LLM MUST receive structured table and view metadata as context for query generation
- Metadata MUST include: table names, column names, data types, relationships
- System MUST cache metadata to avoid repeated database introspection
- Metadata refresh MUST be manual (no automatic refresh in v1.0)
- Users MUST be able to trigger metadata refresh on demand
- Generated SQL MUST still pass through sqlglot validation (Principle II)

**Rationale**: Schema context prevents hallucination and generates queries that actually work. Manual refresh gives users control over when metadata updates occur.

### IV. Demo-Grade Simplicity

**Principle**: Technology and architecture choices MUST prioritize simplicity and rapid development over production-grade concerns.

- SQLite for local storage (connections and metadata); no external database service
- No authentication or authorization in v1.0; open access
- Single-user assumption; no concurrent user concerns
- Error handling focuses on developer clarity over production robustness
- Deployment is local development only; no containerization or cloud deployment

**Rationale**: Enables rapid prototyping and feature validation without operational overhead. Keeps focus on core query functionality rather than infrastructure.

### V. Structured API Integration

**Principle**: Backend and frontend MUST communicate through well-defined JSON APIs with explicit contracts.

- All query results MUST return as JSON
- Error responses MUST follow consistent JSON structure with actionable messages
- API endpoints MUST be documented for frontend integration
- Frontend MUST handle all data presentation (tables, formatting)
- Monaco Editor integration for SQL editing with syntax highlighting

**Rationale**: Clear separation of concerns allows frontend and backend to evolve independently. JSON format enables flexible frontend presentation.

## Technology Stack Constraints

### Backend
- **Language**: Python 3.12+
- **Runtime**: uv for dependency management
- **Framework**: FastAPI
- **Dependencies**: sqlglot, OpenAI SDK, database drivers (psycopg3 for PostgreSQL)
- **Storage**: SQLite local file for connections and metadata

### Frontend
- **Framework**: React
- **UI Kit**: refine 5
- **Styling**: Tailwind CSS
- **Components**: Ant Design
- **Editor**: Monaco Editor for SQL input

### Architecture
- **API Style**: RESTful JSON endpoints
- **State Management**: To be determined during design phase
- **Data Flow**: Backend returns JSON → Frontend renders tables

## Development Standards

### Code Quality
- All SQL MUST be validated before database execution
- Error messages MUST be user-friendly and actionable
- Code structure MUST isolate database-specific logic for future extensibility
- Metadata extraction logic MUST be modular and testable

### Testing Strategy
- Unit tests for SQL validation logic (sqlglot parsing)
- Integration tests for metadata extraction from PostgreSQL
- Manual testing for LLM query generation quality
- No automated frontend testing required for v1.0

### Documentation Requirements
- API endpoints MUST be documented
- Setup instructions for local development
- Database connection format examples
- Natural language query examples with expected SQL output

## Governance

### Amendment Process
- Constitution changes require version bump following semantic versioning
- MAJOR: Remove or redefine principles (backward-incompatible)
- MINOR: Add new principles or materially expand guidance
- PATCH: Clarifications, wording improvements, non-semantic changes

### Compliance Review
- All pull requests MUST verify compliance with core principles
- Technical decisions conflicting with principles require explicit justification
- Complexity beyond demo-grade scope MUST be flagged during review

### Versioning Policy
- Constitution version: MAJOR.MINOR.PATCH
- This constitution v1.0.0 represents initial project governance
- Future amendments update this section with change rationale

**Version**: 1.0.0 | **Ratified**: 2026-04-26 | **Last Amended**: 2026-04-26
