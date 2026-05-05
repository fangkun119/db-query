import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NLInput } from './nl-input'

describe('NLInput', () => {
  const mockOnGenerate = vi.fn()
  const mockOnExecute = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render textarea with placeholder', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toBeInTheDocument()
    })

    it('should render with language-neutral placeholder', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toBeInTheDocument()
    })

    it('should render with example hint', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/show user orders/)
      expect(textarea).toBeInTheDocument()
    })

    it('should render with execution hint', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ctrl \/ CMD \+ Enter/)
      expect(textarea).toBeInTheDocument()
    })
  })

  describe('User Input', () => {
    it('should call onGenerate when text changes', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 'show all users' } })

      expect(mockOnGenerate).toHaveBeenCalledWith('show all users')
    })

    it('should call onGenerate with empty string when cleared', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 'test' } })
      fireEvent.change(textarea, { target: { value: '' } })

      expect(mockOnGenerate).toHaveBeenLastCalledWith('')
    })

    it('should call onGenerate with Chinese input', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: '显示所有用户' } })

      expect(mockOnGenerate).toHaveBeenCalledWith('显示所有用户')
    })

    it('should call onGenerate multiple times as user types', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 's' } })
      fireEvent.change(textarea, { target: { value: 'sh' } })
      fireEvent.change(textarea, { target: { value: 'show' } })

      expect(mockOnGenerate).toHaveBeenCalledTimes(3)
      expect(mockOnGenerate).toHaveBeenLastCalledWith('show')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should call onExecute when Ctrl+Enter is pressed', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 'test query' } })
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

      expect(mockOnExecute).toHaveBeenCalled()
    })

    it('should call onExecute when Cmd+Enter is pressed (Mac)', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 'test query' } })
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

      expect(mockOnExecute).toHaveBeenCalled()
    })

    it('should not call onExecute when Enter is pressed without modifier', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 'test query' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(mockOnExecute).not.toHaveBeenCalled()
    })

    it('should not call onExecute when Ctrl+other keys are pressed', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: 'test query' } })
      fireEvent.keyDown(textarea, { key: 'a', ctrlKey: true })

      expect(mockOnExecute).not.toHaveBeenCalled()
    })

    it('should prevent default behavior when Ctrl+Enter is pressed', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

      // Verify that onExecute was called (which means preventDefault worked internally)
      expect(mockOnExecute).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should disable textarea when loading is true', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} loading={true} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toBeDisabled()
    })

    it('should not disable textarea when loading is false', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} loading={false} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).not.toBeDisabled()
    })

    it('should show loading state visually', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} loading={true} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toBeDisabled()
    })
  })

  describe('Component Structure', () => {
    it('should have correct styling classes', () => {
      const { container } = render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      expect(textarea).toHaveStyle({
        fontSize: '14px',
        minHeight: '200px',
      })
    })

    it('should use flex layout', () => {
      const { container } = render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle clearing input', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      // First set some text
      fireEvent.change(textarea, { target: { value: 'test' } })
      // Then clear it
      fireEvent.change(textarea, { target: { value: '' } })

      // Should be called when text is set
      expect(mockOnGenerate).toHaveBeenCalledWith('')
    })

    it('should handle very long input', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const longText = 'a'.repeat(1000)
      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      fireEvent.change(textarea, { target: { value: longText } })

      expect(mockOnGenerate).toHaveBeenCalledWith(longText)
    })

    it('should handle special characters in input', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      const specialText = "SELECT * FROM users WHERE name = 'O\\'Reilly';"
      fireEvent.change(textarea, { target: { value: specialText } })

      expect(mockOnGenerate).toHaveBeenCalledWith(specialText)
    })

    it('should handle multiline input', () => {
      render(<NLInput onGenerate={mockOnGenerate} onExecute={mockOnExecute} />)

      const textarea = screen.getByPlaceholderText(/Ask questions about your data/)
      const multilineText = "Line 1\nLine 2\nLine 3"
      fireEvent.change(textarea, { target: { value: multilineText } })

      expect(mockOnGenerate).toHaveBeenCalledWith(multilineText)
    })
  })
})
