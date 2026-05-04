import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DatabaseList } from './database-list'
import type { DatabaseSummary } from '../../types'

const mockDatabases: DatabaseSummary[] = [
  {
    name: 'test-db',
    dbType: 'postgresql',
    status: 'active',
    tableCount: 5,
    viewCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
    lastRefreshedAt: '2024-01-01T01:00:00Z'
  },
  {
    name: 'another-db',
    dbType: 'postgresql',
    status: 'error',
    tableCount: 0,
    viewCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    lastRefreshedAt: '2024-01-01T02:00:00Z'
  }
]

describe('DatabaseList', () => {
  it('should render database list', () => {
    const onDelete = vi.fn()
    const onClick = vi.fn()

    render(
      <DatabaseList
        databases={mockDatabases}
        onDelete={onDelete}
        onClick={onClick}
      />
    )

    // Component renders database names in uppercase
    expect(screen.getByText('TEST-DB')).toBeInTheDocument()
    expect(screen.getByText('ANOTHER-DB')).toBeInTheDocument()
  })

  it('should display database counts', () => {
    const onDelete = vi.fn()
    const onClick = vi.fn()

    render(
      <DatabaseList
        databases={mockDatabases}
        onDelete={onDelete}
        onClick={onClick}
      />
    )

    // Component renders "X tables, Y views" format
    expect(screen.getByText('5 tables, 2 views')).toBeInTheDocument()
  })

  it('should call onClick when database item is clicked', () => {
    const onDelete = vi.fn()
    const onClick = vi.fn()

    render(
      <DatabaseList
        databases={mockDatabases}
        onDelete={onDelete}
        onClick={onClick}
      />
    )

    // Find by uppercase name
    const dbItem = screen.getByText('TEST-DB').closest('.database-list-item')
    expect(dbItem).toBeInTheDocument()

    if (dbItem) {
      fireEvent.click(dbItem)
      expect(onClick).toHaveBeenCalledWith('test-db')
    }
  })

  it('should show delete button', () => {
    const onDelete = vi.fn()
    const onClick = vi.fn()

    render(
      <DatabaseList
        databases={mockDatabases}
        onDelete={onDelete}
        onClick={onClick}
      />
    )

    const deleteButtons = screen.getAllByLabelText('delete')
    expect(deleteButtons.length).toBe(2)
  })

  it('should render empty list when no databases', () => {
    const onDelete = vi.fn()
    const onClick = vi.fn()

    const { container } = render(
      <DatabaseList
        databases={[]}
        onDelete={onDelete}
        onClick={onClick}
      />
    )

    expect(container.firstChild).toBeEmptyDOMElement()
  })
})
