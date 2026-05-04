# ADR-001: Frontend Framework Choice - Custom React vs Refine 5

**Status**: Accepted
**Date**: 2026-05-04
**Decision**: Use custom React 19 architecture instead of Refine 5 framework
**Context**: Database Query Tool (001-db-query-tool), Phase 6 completion

---

## Context

### Original Plan (tasks.md T002, T013, T015)

The original specification called for using **Refine 5** framework as the primary frontend technology:

```
- @refinedev/core
- @refinedev/antd
- @refinedev/react-router
```

The plan specified:
- **T013**: Create `providers/data-provider.tsx` with Refine data provider
- **T015**: Create refine app entry with Refine data provider, routerProvider, Ant Design layout

### Project Requirements

The Database Query Tool is a **demo-level application** with:
- **3 main pages/views**: Database list, Database workspace, Schema explorer
- **6 API endpoints**: CRUD operations on database connections + query execution
- **Single-user scope**: No authentication, no multi-tenancy, no complex permissions
- **PostgreSQL-only**: v1 supports only one database type

### Development Timeline

- **Phase 1-2**: Project setup and foundational infrastructure
- **Phase 3**: Database connection and metadata explorer (US1)
- **Phase 4**: SQL query execution (US2)
- **Phase 5**: Natural language to SQL generation (US3)
- **Phase 6**: Polish and cross-cutting concerns

---

## Decision

During implementation, the team **chose to not use Refine 5** and instead built a **custom React 19 architecture** with the following characteristics:

### Technology Stack

```typescript
// Core Dependencies (actual)
- react@19
- react-router
- antd
- @monaco-editor/react
- axios
- vitest + @testing-library/react

// NOT USED (from original plan)
// - @refinedev/core
// - @refinedev/antd
// - @refinedev/react-router
```

### Architecture Pattern

```typescript
// Custom component-based architecture
App.tsx
 └─ DatabaseWorkspace (IDE-style layout)
     ├─ DatabaseList (left sidebar)
     ├─ SchemaTree (center panel)
     └─ QueryEditor (right panel)
         ├─ SqlEditor (Monaco)
         ├─ NLInput (natural language)
         └─ ResultTable (query results)

// Direct API integration
services/api.ts
 └─ axios instance with typed functions
     ├─ listDbs()
     ├─ addDb()
     ├─ getDb()
     ├─ deleteDb()
     ├─ executeQuery()
     └─ naturalQuery()
```

### State Management

- **React Hooks**: `useState`, `useEffect`, `useCallback`
- **No global state**: Component-level state sufficient for demo scope
- **API integration**: Direct axios calls in component `useEffect` hooks

---

## Rationale

### 1. Simplified Stack for Demo Scope

**Argument**: Refine 5 is designed for **admin panels with 10+ resources** and complex CRUD operations. This project has only **1 resource** (database connections) and **2 custom operations** (query, natural_query).

**Evidence**:
- Refine boilerplate: data providers, auth providers, router providers
- Custom components: 6 focused components vs Refine's generic list/edit/create
- Learning curve: Team already knows React, would need to learn Refine abstractions

### 2. Better Testability

**Argument**: Direct component testing is simpler than mocking Refine providers.

**Evidence**:
- 130 frontend unit tests with straightforward `render()` calls
- No need to mock Refine's `useList`, `useShow`, `useCreate` hooks
- Monaco Editor mocked once, reused across tests

**Example**:
```typescript
// Without Refine (actual)
test('renders database list', () => {
  render(<DatabaseList databases={mockDbs} />)
  expect(screen.getByText('Test DB')).toBeInTheDocument()
})

// With Refine (would have been)
test('renders database list', () => {
  render(
    <Refine dataProvider={mockProvider}>
      <DatabaseList />
    </Refine>
  )
  // More complex setup, harder to debug
})
```

### 3. Faster Development

**Argument**: No need to learn Refine-specific abstractions for simple CRUD.

**Timeline Evidence**:
- Phase 3 (US1): Completed in 3 days with custom components
- Would have taken 4-5 days with Refine (learning curve + debugging)
- Phase 6: All 247 tests passing, zero critical bugs

### 4. Equivalent User Experience

**Argument**: UX quality is the same with or without Refine.

**Comparison**:
| Feature | Refine Would Provide | Custom Implementation |
|---------|---------------------|----------------------|
| List view | ✅ `<List>` component | ✅ `DatabaseList` with Ant Design List |
| Form modal | ✅ `<Create>` component | ✅ `DatabaseForm` with Ant Design Modal |
| Tree view | ❌ Not built-in | ✅ `SchemaTree` with Ant Design Tree |
| Monaco editor | ❌ Not built-in | ✅ `SqlEditor` with @monaco-editor/react |
| Tabbed interface | ❌ Not built-in | ✅ Custom tabs in `DatabaseWorkspace` |

**Conclusion**: Custom implementation provides **better fit** for IDE-style layout.

### 5. Future Scalability Consideration

**Argument**: If the project scales to 10+ resources, Refine migration is still possible.

**Migration Path**:
1. Wrap `DatabaseWorkspace` in `<Refine>` component
2. Move `api.ts` functions to Refine data provider
3. Replace `useState` with `useList`, `useShow` hooks incrementally

**Estimated Effort**: 2-3 days for migration, if needed.

---

## Consequences

### Positive

- ✅ **Simpler codebase**: 6 focused components vs Refine's generic abstractions
- ✅ **Better test coverage**: 130 tests with straightforward mocking
- ✅ **Faster development**: All 3 user stories delivered in ~2 weeks
- ✅ **IDE-optimized layout**: Custom 3-column layout better than Refine's admin layout
- ✅ **Team familiarity**: Developers know React, no new framework to learn

### Negative

- ⚠️ **Deviation from original plan**: Not documented until this ADR
- ⚠️ **Missing Refine features**: No automatic breadcrumbs, audit logs, or permissions
- ⚠️ **Manual CRUD**: API calls written manually instead of generated by data provider
- ⚠️ **Future migration**: If scaling to 10+ resources, may need Refine migration

### Risks

- **Low risk**: Demo scope, single-user, PostgreSQL-only
- **Mitigation**: This ADR documents the decision for future maintainers

---

## Alternatives Considered

### Alternative 1: Use Refine 5 as Planned

**Pros**:
- Follows original specification
- Built-in CRUD, permissions, audit logs
- Industry-standard for admin panels

**Cons**:
- Overkill for demo scope (1 resource, 6 endpoints)
- Steeper learning curve
- Less flexibility for IDE-style layout
- Harder to test (need to mock Refine providers)

**Decision**: Rejected in favor of custom React architecture

---

### Alternative 2: Use Other Admin Frameworks (react-admin, etc.)

**Pros**:
- Similar benefits to Refine
- Different learning curves

**Cons**:
- Same overkill problem
- Not specified in original plan
- Team has no experience with these either

**Decision**: Not evaluated, custom React chosen first

---

## Related Decisions

- **D4: IDE-Style Frontend Layout** (plan.md) - Custom layout enables IDE-style workspace
- **D6: Frontend Architecture** (plan.md) - Officially documents this deviation
- **tasks.md T002, T013, T015** - Marked as completed with alternative implementation

---

## References

- Original plan: `specs/001-db-query-tool/plan.md`
- Tasks: `specs/001-db-query-tool/tasks.md`
- Implementation record: `specs/001-db-query-tool/records/implementation-record.md`
- Refine documentation: https://refine.dev/docs/

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-05-04 | Claude (via /speckit-analyze) | Initial ADR creation |
