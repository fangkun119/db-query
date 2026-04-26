<!--
SYNC IMPACT REPORT
==================
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

**Version**: 1.0.0 | **Ratified**: 2026-04-26 | **Last Amended**: 2026-04-26
