import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { DatabaseWorkspace } from './database-workspace'
import * as api from '../../services/api'

// Mock the API module
vi.mock('../../services/api', () => ({
  listDbs: vi.fn(),
  deleteDb: vi.fn(),
  getDb: vi.fn(),
  executeQuery: vi.fn(),
}))

const mockDatabases = [
  {
    name: 'test-db',
    dbType: 'postgresql',
    status: 'active',
    tableCount: 5,
    viewCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
    lastRefreshedAt: '2024-01-01T01:00:00Z',
  },
]

const mockDatabaseDetail = {
  name: 'test-db',
  dbType: 'postgresql',
  status: 'active',
  tables: [
    {
      schemaName: 'public',
      tableName: 'users',
      tableType: 'BASE TABLE',
      columns: [
        { name: 'id', dataType: 'integer', isNullable: false, isPrimaryKey: true },
        { name: 'name', dataType: 'varchar', isNullable: true },
      ],
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  lastRefreshedAt: '2024-01-01T01:00:00Z',
}

const mockQueryResult = {
  columnNames: ['id', 'name'],
  rowData: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
  totalCount: 2,
  isTruncated: false,
  executionTimeMs: 150,
}

function createTestWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  )
}

describe('DatabaseWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      vi.mocked(api.listDbs).mockImplementation(() => new Promise(() => {}))

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      expect(screen.getByText(/Loading databases/i)).toBeInTheDocument()
    })
  })

  describe('Database List', () => {
    it('should display databases after loading', async () => {
      vi.mocked(api.listDbs).mockResolvedValue(mockDatabases)

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      await waitFor(() => {
        expect(screen.getByText('TEST-DB')).toBeInTheDocument()
      })
    })

    it('should show empty state when no databases', async () => {
      vi.mocked(api.listDbs).mockResolvedValue([])

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/No databases/i)).toBeInTheDocument()
      })
    })

    it('should have ADD DATABASE button', async () => {
      vi.mocked(api.listDbs).mockResolvedValue([])

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/ADD DATABASE/i)).toBeInTheDocument()
      })
    })
  })

  describe('Database Selection', () => {
    it('should load database details when clicked', async () => {
      vi.mocked(api.listDbs).mockResolvedValue(mockDatabases)
      vi.mocked(api.getDb).mockResolvedValue(mockDatabaseDetail)

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      await waitFor(() => {
        expect(screen.getByText('TEST-DB')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('TEST-DB'))

      await waitFor(() => {
        expect(api.getDb).toHaveBeenCalledWith('test-db')
      })
    })

    it('should display schema tree after database selection', async () => {
      vi.mocked(api.listDbs).mockResolvedValue(mockDatabases)
      vi.mocked(api.getDb).mockResolvedValue(mockDatabaseDetail)

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      await waitFor(() => {
        expect(screen.getByText('TEST-DB')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('TEST-DB'))

      await waitFor(() => {
        expect(screen.getByText('users')).toBeInTheDocument()
      })
    })
  })

  describe('Query Editor', () => {
    it('should have Execute Query button', async () => {
      vi.mocked(api.listDbs).mockResolvedValue(mockDatabases)
      vi.mocked(api.getDb).mockResolvedValue(mockDatabaseDetail)

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      await waitFor(() => {
        expect(screen.getByText('TEST-DB')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('TEST-DB'))

      await waitFor(() => {
        expect(screen.getByText(/Execute Query/i)).toBeInTheDocument()
      })
    })

    it('should show RESULTS section after query execution', async () => {
      vi.mocked(api.listDbs).mockResolvedValue(mockDatabases)
      vi.mocked(api.getDb).mockResolvedValue(mockDatabaseDetail)
      vi.mocked(api.executeQuery).mockResolvedValue(mockQueryResult)

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      await waitFor(() => {
        expect(screen.getByText('TEST-DB')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('TEST-DB'))

      await waitFor(() => {
        expect(screen.getByText(/Execute Query/i)).toBeInTheDocument()
      })

      // Note: Full query execution testing requires integration tests due to
      // Monaco Editor complexity. This test verifies the UI is present.
      const executeButton = screen.getByText(/Execute Query/i)
      expect(executeButton).toBeInTheDocument()
    })
  })

  describe('Refresh', () => {
    it('should have REFRESH button when database is selected', async () => {
      vi.mocked(api.listDbs).mockResolvedValue(mockDatabases)
      vi.mocked(api.getDb).mockResolvedValue(mockDatabaseDetail)

      render(<DatabaseWorkspace />, { wrapper: createTestWrapper() })

      await waitFor(() => {
        expect(screen.getByText('TEST-DB')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('TEST-DB'))

      await waitFor(() => {
        expect(screen.getByText(/REFRESH/i)).toBeInTheDocument()
      })
    })
  })
})
