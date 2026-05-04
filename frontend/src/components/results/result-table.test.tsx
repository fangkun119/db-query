import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultTable } from './result-table'
import type { QueryResult } from '../../types'

// Mock ResizeObserver before importing the component
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

global.ResizeObserver = MockResizeObserver as any

describe('ResultTable', () => {
  const mockQueryResult: QueryResult = {
    columnNames: ['id', 'name', 'email'],
    rowData: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      { id: 3, name: null, email: 'null@example.com' },
    ],
    totalCount: 3,
    isTruncated: false,
    executionTimeMs: 150.5,
  }

  const mockLargeResult: QueryResult = {
    columnNames: ['id', 'value'],
    rowData: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
    totalCount: 1000,
    isTruncated: true,
    executionTimeMs: 500.25,
  }

  const mockEmptyResult: QueryResult = {
    columnNames: ['id', 'name'],
    rowData: [],
    totalCount: 0,
    isTruncated: false,
    executionTimeMs: 10.0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('should show empty state message when no result and not loading', () => {
      render(<ResultTable result={null} loading={false} />)

      expect(screen.getByText(/Results will be displayed here/)).toBeInTheDocument()
    })

    it('should show loading state when loading is true', () => {
      render(<ResultTable result={null} loading={true} />)

      expect(screen.getByText(/Executing query/)).toBeInTheDocument()
    })

    it('should show nothing when result is null but component is still rendered', () => {
      const { container } = render(<ResultTable result={null} loading={false} />)

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Data Display', () => {
    it('should render table with column headers in uppercase', () => {
      render(<ResultTable result={mockQueryResult} loading={false} />)

      // Use getAllByText since column names might appear elsewhere
      const idHeaders = screen.getAllByText('ID')
      expect(idHeaders.length).toBeGreaterThan(0)

      const nameHeaders = screen.getAllByText('NAME')
      expect(nameHeaders.length).toBeGreaterThan(0)

      const emailHeaders = screen.getAllByText('EMAIL')
      expect(emailHeaders.length).toBeGreaterThan(0)
    })

    it('should render all rows from rowData', () => {
      render(<ResultTable result={mockQueryResult} loading={false} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should display NULL values correctly', () => {
      render(<ResultTable result={mockQueryResult} loading={false} />)

      // Find all NULL indicators
      const nullElements = screen.getAllByText('NULL')
      expect(nullElements.length).toBeGreaterThan(0)
    })

    it('should handle empty result set', () => {
      render(<ResultTable result={mockEmptyResult} loading={false} />)

      // Should show column headers
      const idHeaders = screen.getAllByText('ID')
      expect(idHeaders.length).toBeGreaterThan(0)

      const nameHeaders = screen.getAllByText('NAME')
      expect(nameHeaders.length).toBeGreaterThan(0)

      // But no data rows
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('should handle large result sets', () => {
      render(<ResultTable result={mockLargeResult} loading={false} />)

      // Should render without errors
      const idHeaders = screen.getAllByText('ID')
      expect(idHeaders.length).toBeGreaterThan(0)

      const valueHeaders = screen.getAllByText('VALUE')
      expect(valueHeaders.length).toBeGreaterThan(0)
    })
  })

  describe('Truncation Warning', () => {
    it('should show truncation warning when isTruncated is true and totalCount >= 1000', () => {
      render(<ResultTable result={mockLargeResult} loading={false} />)

      expect(screen.getByText(/Max \d+ rows displayed/)).toBeInTheDocument()
      expect(screen.getByText(/LIMIT automatically set/)).toBeInTheDocument()
    })

    it('should NOT show truncation warning when isTruncated is false', () => {
      render(<ResultTable result={mockQueryResult} loading={false} />)

      expect(screen.queryByText(/Max \d+ rows displayed/)).not.toBeInTheDocument()
    })

    it('should NOT show truncation warning when totalCount < 1000', () => {
      const smallResult: QueryResult = {
        ...mockQueryResult,
        totalCount: 100,
        isTruncated: true,
      }

      render(<ResultTable result={smallResult} loading={false} />)

      expect(screen.queryByText(/Max \d+ rows displayed/)).not.toBeInTheDocument()
    })
  })

  describe('Data Types', () => {
    it('should handle numeric values correctly', () => {
      const numericResult: QueryResult = {
        columnNames: ['count', 'price', 'rating'],
        rowData: [
          { count: 42, price: 19.99, rating: 4.5 },
          { count: 0, price: 0.0, rating: -1.0 },
        ],
        totalCount: 2,
        isTruncated: false,
        executionTimeMs: 5.0,
      }

      render(<ResultTable result={numericResult} loading={false} />)

      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('19.99')).toBeInTheDocument()
      expect(screen.getByText('4.5')).toBeInTheDocument()
    })

    it('should handle boolean values correctly', () => {
      const booleanResult: QueryResult = {
        columnNames: ['active', 'verified'],
        rowData: [
          { active: true, verified: false },
          { active: false, verified: true },
        ],
        totalCount: 2,
        isTruncated: false,
        executionTimeMs: 5.0,
      }

      render(<ResultTable result={booleanResult} loading={false} />)

      // Use getAllByText since 'true'/'false' might appear multiple times
      const trueValues = screen.getAllByText('true')
      expect(trueValues.length).toBeGreaterThan(0)

      const falseValues = screen.getAllByText('false')
      expect(falseValues.length).toBeGreaterThan(0)
    })

    it('should handle undefined values correctly', () => {
      const undefinedResult: QueryResult = {
        columnNames: ['id', 'optional'],
        rowData: [
          { id: 1, optional: 'value' },
          { id: 2, optional: undefined },
        ],
        totalCount: 2,
        isTruncated: false,
        executionTimeMs: 5.0,
      }

      render(<ResultTable result={undefinedResult} loading={false} />)

      expect(screen.getByText('value')).toBeInTheDocument()
      // Undefined should show as '-'
      const dashElements = screen.getAllByText('-')
      expect(dashElements.length).toBeGreaterThan(0)
    })

    it('should handle string values correctly', () => {
      const stringResult: QueryResult = {
        columnNames: ['text', 'empty'],
        rowData: [
          { text: 'Hello World', empty: '' },
          { text: '123', empty: 'not empty' },
        ],
        totalCount: 2,
        isTruncated: false,
        executionTimeMs: 5.0,
      }

      render(<ResultTable result={stringResult} loading={false} />)

      expect(screen.getByText('Hello World')).toBeInTheDocument()
      expect(screen.getByText('123')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle single column result', () => {
      const singleColumnResult: QueryResult = {
        columnNames: ['value'],
        rowData: [
          { value: 'first' },
          { value: 'second' },
        ],
        totalCount: 2,
        isTruncated: false,
        executionTimeMs: 5.0,
      }

      render(<ResultTable result={singleColumnResult} loading={false} />)

      // Use getAllByText for headers
      const valueHeaders = screen.getAllByText('VALUE')
      expect(valueHeaders.length).toBeGreaterThan(0)

      expect(screen.getByText('first')).toBeInTheDocument()
    })

    it('should handle result with many columns', () => {
      const manyColumnsResult: QueryResult = {
        columnNames: ['col1', 'col2', 'col3', 'col4', 'col5', 'col6', 'col7', 'col8'],
        rowData: [
          { col1: '1', col2: '2', col3: '3', col4: '4', col5: '5', col6: '6', col7: '7', col8: '8' },
        ],
        totalCount: 1,
        isTruncated: false,
        executionTimeMs: 5.0,
      }

      render(<ResultTable result={manyColumnsResult} loading={false} />)

      // Use getAllByText for headers
      const col1Headers = screen.getAllByText('COL1')
      expect(col1Headers.length).toBeGreaterThan(0)

      const col8Headers = screen.getAllByText('COL8')
      expect(col8Headers.length).toBeGreaterThan(0)
    })

    it('should handle result with special characters in data', () => {
      const specialCharsResult: QueryResult = {
        columnNames: ['text'],
        rowData: [
          { text: 'Hello <script>alert("xss")</script>' },
          { text: 'Quotes: "test" and \'test\'' },
          { text: 'Emoji: 😀🎉' },
        ],
        totalCount: 3,
        isTruncated: false,
        executionTimeMs: 5.0,
      }

      render(<ResultTable result={specialCharsResult} loading={false} />)

      expect(screen.getByText(/Hello/)).toBeInTheDocument()
      expect(screen.getByText(/Quotes:/)).toBeInTheDocument()
      expect(screen.getByText(/Emoji:/)).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('should show pagination for large results', () => {
      render(<ResultTable result={mockLargeResult} loading={false} />)

      // Check for pagination elements (Ant Design shows page size selector)
      const totalText = screen.getByText(/Total \d+ row/)
      expect(totalText).toBeInTheDocument()
    })

    it('should show correct total count', () => {
      render(<ResultTable result={mockQueryResult} loading={false} />)

      expect(screen.getByText('Total 3 rows')).toBeInTheDocument()
    })

    it('should handle singular form for single row', () => {
      const singleRowResult: QueryResult = {
        ...mockQueryResult,
        rowData: [mockQueryResult.rowData[0]],
        totalCount: 1,
      }

      render(<ResultTable result={singleRowResult} loading={false} />)

      expect(screen.getByText('Total 1 row')).toBeInTheDocument()
    })
  })

  describe('Component Structure', () => {
    it('should apply correct CSS classes', () => {
      const { container } = render(<ResultTable result={mockQueryResult} loading={false} />)

      const table = container.querySelector('.ant-table')
      expect(table).toBeInTheDocument()
    })

    it('should be bordered', () => {
      const { container } = render(<ResultTable result={mockQueryResult} loading={false} />)

      const table = container.querySelector('.ant-table-bordered')
      expect(table).toBeInTheDocument()
    })

    it('should use small size', () => {
      const { container } = render(<ResultTable result={mockQueryResult} loading={false} />)

      const table = container.querySelector('.ant-table-small')
      expect(table).toBeInTheDocument()
    })
  })
})
