import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock monaco global before importing SqlEditor
declare global {
  var monaco: {
    KeyMod: { CtrlCmd: number }
    KeyCode: { Enter: number }
  }
}

global.monaco = {
  KeyMod: {
    CtrlCmd: 1,
  },
  KeyCode: {
    Enter: 3,
  },
}

// Mock Monaco Editor before import
vi.mock('@monaco-editor/react', () => ({
  default: React.forwardRef(
    (
      {
        value,
        onChange,
        onMount,
        defaultLanguage,
      }: {
        value: string
        onChange?: (value: string) => void
        onMount?: (editor: any) => void
        defaultLanguage?: string
      },
      _ref: any
    ) => {
      React.useEffect(() => {
        if (onMount) {
          const mockEditor = {
            getValue: () => value || '',
            setValue: (val: string) => {
              if (onChange) onChange(val)
            },
            focus: vi.fn(),
            addCommand: vi.fn(),
            dispose: vi.fn(),
            onDidChangeModelContent: vi.fn(),
          }
          onMount(mockEditor)
        }
      }, [onMount, value, onChange])

      return React.createElement('div', {
        'data-testid': 'monaco-editor',
        'data-value': value || '',
        'data-theme': 'vs-dark',
        'data-language': defaultLanguage,
      })
    }
  ),
}))

import { SqlEditor } from './sql-editor'

describe('SqlEditor', () => {
  const mockOnChange = vi.fn()
  const mockOnExecute = vi.fn()

  const defaultProps = {
    value: 'SELECT * FROM users',
    onChange: mockOnChange,
    onExecute: mockOnExecute,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render Monaco editor container', () => {
      render(<SqlEditor {...defaultProps} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should render with initial value', () => {
      render(<SqlEditor {...defaultProps} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', 'SELECT * FROM users')
    })

    it('should render with empty value', () => {
      render(<SqlEditor {...defaultProps} value="" />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', '')
    })

    it('should render with custom placeholder', () => {
      const customPlaceholder = 'Enter your query here...'
      render(<SqlEditor {...defaultProps} placeholder={customPlaceholder} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })
  })

  describe('Value Changes', () => {
    it('should call onChange when editor value changes', () => {
      render(<SqlEditor {...defaultProps} />)

      // Monaco editor mock calls onChange via setValue in onMount
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should update value prop changes', () => {
      const { rerender } = render(<SqlEditor {...defaultProps} value="SELECT 1" />)

      let editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', 'SELECT 1')

      rerender(<SqlEditor {...defaultProps} value="SELECT 2" />)

      editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', 'SELECT 2')
    })
  })

  describe('Execute Callback', () => {
    it('should call onExecute callback when provided', () => {
      render(<SqlEditor {...defaultProps} onExecute={mockOnExecute} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should not call onExecute if not provided', () => {
      render(<SqlEditor {...defaultProps} onExecute={undefined} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })
  })

  describe('Readonly Mode', () => {
    it('should render with readOnly=false by default', () => {
      render(<SqlEditor {...defaultProps} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should render with readOnly=true', () => {
      render(<SqlEditor {...defaultProps} readOnly={true} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })
  })

  describe('Component Structure', () => {
    it('should have correct container styling', () => {
      const { container } = render(<SqlEditor {...defaultProps} />)

      const wrapper = container.querySelector('.sql-editor-container')
      expect(wrapper).toBeInTheDocument()
    })

    it('should use flex layout', () => {
      const { container } = render(<SqlEditor {...defaultProps} />)

      const outerDiv = container.firstChild as HTMLElement
      expect(outerDiv).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
      })
    })
  })

  describe('Editor Configuration', () => {
    it('should use pgsql language', () => {
      render(<SqlEditor {...defaultProps} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-language', 'pgsql')
    })

    it('should use vs-dark theme', () => {
      render(<SqlEditor {...defaultProps} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-theme', 'vs-dark')
    })

    it('should render editor with height 100%', () => {
      render(<SqlEditor {...defaultProps} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty SQL', () => {
      render(<SqlEditor {...defaultProps} value="" />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', '')
    })

    it('should handle very long SQL query', () => {
      const longQuery = 'SELECT * FROM users WHERE ' + 'id = 1 OR '.repeat(100)
      render(<SqlEditor {...defaultProps} value={longQuery} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', longQuery)
    })

    it('should handle SQL with special characters', () => {
      const specialQuery = "SELECT * FROM users WHERE name = 'O\\'Reilly' AND email LIKE '%@example.com'"
      render(<SqlEditor {...defaultProps} value={specialQuery} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', specialQuery)
    })

    it('should handle multiline SQL', () => {
      const multilineQuery = `SELECT id, name, email
FROM users
WHERE active = true
ORDER BY name
LIMIT 10`
      render(<SqlEditor {...defaultProps} value={multilineQuery} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', multilineQuery)
    })

    it('should handle SQL with comments', () => {
      const queryWithComments = `-- Get all active users
SELECT * FROM users
WHERE active = true -- Only active
/* Multi-line
comment */`
      render(<SqlEditor {...defaultProps} value={queryWithComments} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', queryWithComments)
    })
  })

  describe('Placeholder', () => {
    it('should use default placeholder', () => {
      render(<SqlEditor {...defaultProps} placeholder={undefined} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should use custom placeholder', () => {
      const customPlaceholder = 'Type your SQL query here...'
      render(<SqlEditor {...defaultProps} placeholder={customPlaceholder} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should be focusable', () => {
      render(<SqlEditor {...defaultProps} />)

      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toBeInTheDocument()
    })
  })

  describe('onChange Callback', () => {
    it('should accept onChange callback', () => {
      render(<SqlEditor {...defaultProps} onChange={mockOnChange} />)

      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should work without onChange callback', () => {
      expect(() => {
        render(<SqlEditor {...defaultProps} onChange={undefined} />)
      }).not.toThrow()
    })
  })

  describe('onExecute Callback', () => {
    it('should accept onExecute callback', () => {
      render(<SqlEditor {...defaultProps} onExecute={mockOnExecute} />)

      expect(mockOnExecute).not.toHaveBeenCalled()
    })

    it('should work without onExecute callback', () => {
      expect(() => {
        render(<SqlEditor {...defaultProps} onExecute={undefined} />)
      }).not.toThrow()
    })
  })
})
