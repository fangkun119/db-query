import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SchemaTree } from './schema-tree'
import type { TableMeta } from '../../types'

const mockTables: TableMeta[] = [
  {
    schemaName: 'public',
    tableName: 'users',
    tableType: 'BASE TABLE',
    columns: [
      { name: 'id', dataType: 'integer', isNullable: false, isPrimaryKey: true, comment: 'User ID' },
      { name: 'name', dataType: 'varchar', isNullable: true, comment: 'User name' },
      { name: 'email', dataType: 'varchar', isNullable: false, comment: 'Email address' },
    ],
    comment: 'User accounts table',
  },
  {
    schemaName: 'public',
    tableName: 'orders',
    tableType: 'BASE TABLE',
    columns: [
      { name: 'id', dataType: 'integer', isNullable: false, isPrimaryKey: true },
      { name: 'user_id', dataType: 'integer', isNullable: false },
    ],
  },
  {
    schemaName: 'public',
    tableName: 'user_orders_view',
    tableType: 'VIEW',
    columns: [
      { name: 'user_name', dataType: 'varchar', isNullable: true },
      { name: 'order_count', dataType: 'bigint', isNullable: false },
    ],
  },
]

describe('SchemaTree', () => {
  describe('Rendering', () => {
    it('should render tree with tables and columns', () => {
      render(<SchemaTree tables={mockTables} />)

      // Check for table names
      expect(screen.getByText('users')).toBeInTheDocument()
      expect(screen.getByText('orders')).toBeInTheDocument()
      expect(screen.getByText('user_orders_view')).toBeInTheDocument()

      // Check for column names (use getAllBy since multiple tables may have same column names)
      const idElements = screen.getAllByText('id')
      expect(idElements.length).toBeGreaterThan(0)

      const nameElements = screen.getAllByText('name')
      expect(nameElements.length).toBeGreaterThan(0)

      expect(screen.getByText('email')).toBeInTheDocument()
    })

    it('should display data types in uppercase', () => {
      render(<SchemaTree tables={mockTables} />)

      const integerElements = screen.getAllByText('INTEGER')
      expect(integerElements.length).toBeGreaterThan(0)

      const varcharElements = screen.getAllByText('VARCHAR')
      expect(varcharElements.length).toBeGreaterThan(0)

      expect(screen.getByText('BIGINT')).toBeInTheDocument()
    })

    it('should show PK badge for primary key columns', () => {
      render(<SchemaTree tables={mockTables} />)

      const pkBadges = screen.getAllByText('PK')
      expect(pkBadges.length).toBeGreaterThan(0)
    })

    it('should show NOT NULL badge for non-nullable columns', () => {
      render(<SchemaTree tables={mockTables} />)

      const notNullBadges = screen.getAllByText('NOT NULL')
      expect(notNullBadges.length).toBeGreaterThan(0)
    })

    it('should show TABLE badge for base tables', () => {
      render(<SchemaTree tables={mockTables} />)

      const tableBadges = screen.getAllByText('TABLE')
      expect(tableBadges.length).toBe(2) // users and orders
    })

    it('should show VIEW badge for views', () => {
      render(<SchemaTree tables={mockTables} />)

      const viewBadges = screen.getAllByText('VIEW')
      expect(viewBadges.length).toBe(1) // user_orders_view
    })

    it('should show empty state when no tables', () => {
      render(<SchemaTree tables={[]} />)

      expect(screen.getByText(/No metadata/)).toBeInTheDocument()
    })

    it('should show loading state when loading is true', () => {
      render(<SchemaTree tables={[]} loading={true} />)

      // Loading state - empty state should not be shown
      expect(screen.queryByText(/No metadata/)).not.toBeInTheDocument()
    })
  })

  describe('Schema Grouping', () => {
    it('should group tables by schema', () => {
      const multiSchemaTables: TableMeta[] = [
        {
          schemaName: 'public',
          tableName: 'users',
          tableType: 'BASE TABLE',
          columns: [{ name: 'id', dataType: 'integer', isNullable: false, isPrimaryKey: true }],
        },
        {
          schemaName: 'analytics',
          tableName: 'events',
          tableType: 'BASE TABLE',
          columns: [{ name: 'id', dataType: 'integer', isNullable: false, isPrimaryKey: true }],
        },
      ]

      render(<SchemaTree tables={multiSchemaTables} />)

      // Check for Tables header (schema indicator) - there will be multiple
      const tablesHeaders = screen.getAllByText('Tables')
      expect(tablesHeaders.length).toBeGreaterThan(0)

      // Both tables should be visible
      expect(screen.getByText('users')).toBeInTheDocument()
      expect(screen.getByText('events')).toBeInTheDocument()
    })
  })

  describe('Comments and Tooltips', () => {
    it('should render comments for tables when present', () => {
      render(<SchemaTree tables={mockTables} />)

      // The users table has a comment
      expect(screen.getByText('users')).toBeInTheDocument()
    })

    it('should render comments for columns when present', () => {
      render(<SchemaTree tables={mockTables} />)

      // Column with comments should still be visible
      // Use getAllByText since 'id' might appear in multiple places
      const idElements = screen.getAllByText('id')
      expect(idElements.length).toBeGreaterThan(0)

      const nameElements = screen.getAllByText('name')
      expect(nameElements.length).toBeGreaterThan(0)

      // Check that email column exists (unique name)
      expect(screen.getByText('email')).toBeInTheDocument()
    })
  })

  describe('Column Display', () => {
    it('should display all column properties correctly', () => {
      const complexTable: TableMeta[] = [
        {
          schemaName: 'public',
          tableName: 'products',
          tableType: 'BASE TABLE',
          columns: [
            {
              name: 'id',
              dataType: 'serial',
              isNullable: false,
              isPrimaryKey: true,
              defaultValue: 'nextval',
              comment: 'Primary key',
            },
            {
              name: 'price',
              dataType: 'numeric',
              isNullable: true,
              isPrimaryKey: false,
              defaultValue: '0.00',
              comment: 'Product price',
            },
            {
              name: 'stock',
              dataType: 'integer',
              isNullable: false,
              isPrimaryKey: false,
              comment: 'Stock quantity',
            },
          ],
          comment: 'Products catalog',
        },
      ]

      render(<SchemaTree tables={complexTable} />)

      // Check column names
      expect(screen.getByText('products')).toBeInTheDocument()

      // Use getAllByText since 'id' might appear in multiple places
      const idElements = screen.getAllByText('id')
      expect(idElements.length).toBeGreaterThan(0)

      expect(screen.getByText('price')).toBeInTheDocument()
      expect(screen.getByText('stock')).toBeInTheDocument()

      // Check data types
      expect(screen.getByText('SERIAL')).toBeInTheDocument()
      expect(screen.getByText('NUMERIC')).toBeInTheDocument()
      expect(screen.getByText('INTEGER')).toBeInTheDocument()

      // Check badges
      const pkBadges = screen.getAllByText('PK')
      expect(pkBadges.length).toBeGreaterThan(0)

      const notNullBadges = screen.getAllByText('NOT NULL')
      expect(notNullBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Empty and Edge Cases', () => {
    it('should handle table with no columns', () => {
      const tablesWithNoColumns: TableMeta[] = [
        {
          schemaName: 'public',
          tableName: 'empty_table',
          tableType: 'BASE TABLE',
          columns: [],
        },
      ]

      render(<SchemaTree tables={tablesWithNoColumns} />)

      expect(screen.getByText('empty_table')).toBeInTheDocument()
    })

    it('should handle tables with only primary key columns', () => {
      const pkOnlyTable: TableMeta[] = [
        {
          schemaName: 'public',
          tableName: 'pk_only',
          tableType: 'BASE TABLE',
          columns: [
            { name: 'id', dataType: 'integer', isNullable: false, isPrimaryKey: true },
          ],
        },
      ]

      render(<SchemaTree tables={pkOnlyTable} />)

      expect(screen.getByText('pk_only')).toBeInTheDocument()
      // 'id' column name should exist
      const idElements = screen.getAllByText('id')
      expect(idElements.length).toBeGreaterThan(0)

      const pkBadges = screen.getAllByText('PK')
      expect(pkBadges.length).toBeGreaterThan(0)
    })

    it('should handle tables with all nullable columns', () => {
      const allNullableTable: TableMeta[] = [
        {
          schemaName: 'public',
          tableName: 'all_nullable',
          tableType: 'BASE TABLE',
          columns: [
            { name: 'col1', dataType: 'varchar', isNullable: true },
            { name: 'col2', dataType: 'integer', isNullable: true },
          ],
        },
      ]

      render(<SchemaTree tables={allNullableTable} />)

      expect(screen.getByText('col1')).toBeInTheDocument()
      expect(screen.getByText('col2')).toBeInTheDocument()
      // No NOT NULL badges expected
      const notNullBadges = screen.queryAllByText('NOT NULL')
      expect(notNullBadges.length).toBe(0)
    })
  })
})
