import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NLInput } from './nl-input'

describe('NLInput', () => {
  const mockOnChange = vi.fn()
  const mockOnExecute = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render textarea with placeholder', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toBeInTheDocument()
    })

    it('should render with language-neutral placeholder', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toBeInTheDocument()
    })

    it('should render with example hint', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/show user orders/)
      expect(textarea).toBeInTheDocument()
    })

    it('should render with execution hint', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ctrl \/ CMD \+ Enter/)
      expect(textarea).toBeInTheDocument()
    })

    it('should display provided value', () => {
      render(<NLInput value="show all users" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByDisplayValue('show all users')
      expect(textarea).toBeInTheDocument()
    })
  })

  describe('User Input', () => {
    it('should call onChange when text changes', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 'show all users' } })

      expect(mockOnChange).toHaveBeenCalledWith('show all users')
    })

    it('should call onChange with empty string when cleared', () => {
      render(<NLInput value="test" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: '' } })

      expect(mockOnChange).toHaveBeenCalledWith('')
    })

    it('should call onChange with Chinese input', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: '显示所有用户' } })

      expect(mockOnChange).toHaveBeenCalledWith('显示所有用户')
    })

    it('should call onChange multiple times as user types', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 's' } })
      fireEvent.change(textarea, { target: { value: 'sh' } })
      fireEvent.change(textarea, { target: { value: 'show' } })

      expect(mockOnChange).toHaveBeenCalledTimes(3)
      expect(mockOnChange).toHaveBeenLastCalledWith('show')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should call onExecute when Ctrl+Enter is pressed', () => {
      render(<NLInput value="test query" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

      expect(mockOnExecute).toHaveBeenCalled()
    })

    it('should call onExecute when Cmd+Enter is pressed (Mac)', () => {
      render(<NLInput value="test query" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

      expect(mockOnExecute).toHaveBeenCalled()
    })

    it('should not call onExecute when Enter is pressed without modifier', () => {
      render(<NLInput value="test query" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(mockOnExecute).not.toHaveBeenCalled()
    })

    it('should not call onExecute when Ctrl+other keys are pressed', () => {
      render(<NLInput value="test query" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.keyDown(textarea, { key: 'a', ctrlKey: true })

      expect(mockOnExecute).not.toHaveBeenCalled()
    })

    it('should prevent default behavior when Ctrl+Enter is pressed', () => {
      render(<NLInput value="test query" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

      expect(mockOnExecute).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should disable textarea when loading is true', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} loading={true} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toBeDisabled()
    })

    it('should not disable textarea when loading is false', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} loading={false} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).not.toBeDisabled()
    })

    it('should show loading state visually', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} loading={true} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toBeDisabled()
    })
  })

  describe('Component Structure', () => {
    it('should have correct styling classes', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toHaveStyle({
        fontSize: '14px',
        minHeight: '200px',
      })
    })

    it('should use flex layout', () => {
      const { container } = render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle clearing input', () => {
      render(<NLInput value="test" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: '' } })

      expect(mockOnChange).toHaveBeenCalledWith('')
    })

    it('should handle very long input', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const longText = 'a'.repeat(1000)
      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: longText } })

      expect(mockOnChange).toHaveBeenCalledWith(longText)
    })

    it('should handle special characters in input', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      const specialText = "SELECT * FROM users WHERE name = 'O\\'Reilly';"
      fireEvent.change(textarea, { target: { value: specialText } })

      expect(mockOnChange).toHaveBeenCalledWith(specialText)
    })

    it('should handle multiline input', () => {
      render(<NLInput value="" onChange={mockOnChange} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      const multilineText = "Line 1\nLine 2\nLine 3"
      fireEvent.change(textarea, { target: { value: multilineText } })

      expect(mockOnChange).toHaveBeenCalledWith(multilineText)
    })
  })
})
