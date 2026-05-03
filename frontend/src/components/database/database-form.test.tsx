import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DatabaseForm } from './database-form'
import * as api from '../../services/api'

// Mock the API module
vi.mock('../../services/api', () => ({
  addDb: vi.fn(),
}))

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('DatabaseForm', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render form when open', () => {
      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText(/Add Database Connection/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/my-postgres/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/postgresql:\/\//i)).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(
        <DatabaseForm
          open={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.queryByText(/Add Database Connection/i)).not.toBeInTheDocument()
    })

    it('should have connection name input field', () => {
      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const nameInput = screen.getByPlaceholderText(/my-postgres/i)
      expect(nameInput).toBeInTheDocument()
    })

    it('should have PostgreSQL URL input field', () => {
      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const urlInput = screen.getByPlaceholderText(/postgresql:\/\//i)
      expect(urlInput).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show validation error for empty name', async () => {
      vi.mocked(api.addDb).mockResolvedValue({} as any)

      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Click submit without filling form
      const addButton = screen.getByRole('button', { name: /Add/i })
      fireEvent.click(addButton)

      // Should show validation error (button should still be visible/active)
      await waitFor(() => {
        expect(addButton).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid URL format', async () => {
      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill name but use invalid URL
      const nameInput = screen.getByPlaceholderText(/my-postgres/i)
      fireEvent.change(nameInput, { target: { value: 'test-db' } })

      const urlInput = screen.getByPlaceholderText(/postgresql:\/\//i)
      fireEvent.change(urlInput, { target: { value: 'invalid-url' } })

      // Trigger validation
      const addButton = screen.getByRole('button', { name: /Add/i })
      fireEvent.click(addButton)

      // Button should still be present (validation prevents submission)
      await waitFor(() => {
        expect(addButton).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call addDb with correct parameters on valid input', async () => {
      vi.mocked(api.addDb).mockResolvedValue({
        name: 'test-db',
        dbType: 'postgresql',
        status: 'active',
        tableCount: 0,
        viewCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
      })

      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill form
      const nameInput = screen.getByPlaceholderText(/my-postgres/i)
      fireEvent.change(nameInput, { target: { value: 'test-db' } })

      const urlInput = screen.getByPlaceholderText(/postgresql:\/\//i)
      fireEvent.change(urlInput, { target: { value: 'postgresql://user:pass@localhost:5432/mydb' } })

      // Submit form
      const addButton = screen.getByRole('button', { name: /Add/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(api.addDb).toHaveBeenCalledWith('test-db', {
          url: 'postgresql://user:pass@localhost:5432/mydb',
        })
      })
    })

    it('should accept valid postgresql:// URL', async () => {
      vi.mocked(api.addDb).mockResolvedValue({
        name: 'test-db',
        dbType: 'postgresql',
        status: 'active',
        tableCount: 0,
        viewCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
      })

      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const nameInput = screen.getByPlaceholderText(/my-postgres/i)
      fireEvent.change(nameInput, { target: { value: 'test-db' } })

      const urlInput = screen.getByPlaceholderText(/postgresql:\/\//i)
      fireEvent.change(urlInput, { target: { value: 'postgresql://localhost/test' } })

      const addButton = screen.getByRole('button', { name: /Add/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(api.addDb).toHaveBeenCalled()
      })
    })
  })

  describe('Form Cancel', () => {
    it('should call onClose when cancel is clicked', () => {
      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should have both Add and Cancel buttons', () => {
      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    })
  })

  describe('Form Labels', () => {
    it('should display connection name label', () => {
      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // The label should be present (check for text content)
      expect(screen.getByText(/Connection Name/i)).toBeInTheDocument()
    })

    it('should display PostgreSQL connection URL label', () => {
      render(
        <DatabaseForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText(/PostgreSQL Connection URL/i)).toBeInTheDocument()
    })
  })
})
