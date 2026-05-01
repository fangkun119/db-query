import { describe, it, expect } from 'vitest'
import type {
  ColumnMeta,
  TableMeta,
  DatabaseSummary,
  QueryResult,
  QueryRequest,
  NaturalQueryRequest,
  CreateConnectionRequest
} from './index'

describe('Type Definitions', () => {
  describe('ColumnMeta', () => {
    it('should accept valid column metadata', () => {
      const column: ColumnMeta = {
        name: 'id',
        dataType: 'integer',
        isNullable: false
      }
      expect(column.name).toBe('id')
      expect(column.dataType).toBe('integer')
      expect(column.isNullable).toBe(false)
    })

    it('should accept optional defaultValue', () => {
      const column: ColumnMeta = {
        name: 'status',
        dataType: 'varchar',
        isNullable: true,
        defaultValue: 'active'
      }
      expect(column.defaultValue).toBe('active')
    })
  })

  describe('TableMeta', () => {
    it('should accept valid table metadata', () => {
      const table: TableMeta = {
        schemaName: 'public',
        tableName: 'users',
        tableType: 'BASE TABLE',
        columns: [
          {
            name: 'id',
            dataType: 'integer',
            isNullable: false
          }
        ]
      }
      expect(table.tableName).toBe('users')
      expect(table.columns.length).toBe(1)
    })
  })

  describe('DatabaseSummary', () => {
    it('should accept valid database summary', () => {
      const db: DatabaseSummary = {
        name: 'test-db',
        dbType: 'postgresql',
        status: 'active',
        tableCount: 5,
        viewCount: 2,
        createdAt: '2024-01-01T00:00:00Z',
        lastRefreshedAt: '2024-01-01T01:00:00Z'
      }
      expect(db.name).toBe('test-db')
      expect(db.status).toBe('active')
    })
  })

  describe('QueryResult', () => {
    it('should accept valid query result', () => {
      const result: QueryResult = {
        columnNames: ['id', 'name'],
        rowData: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        totalCount: 2,
        isTruncated: false,
        executionTimeMs: 123.45
      }
      expect(result.totalCount).toBe(2)
      expect(result.isTruncated).toBe(false)
      expect(result.executionTimeMs).toBe(123.45)
    })

    it('should accept empty result', () => {
      const result: QueryResult = {
        columnNames: [],
        rowData: [],
        totalCount: 0,
        isTruncated: false,
        executionTimeMs: 10
      }
      expect(result.totalCount).toBe(0)
    })
  })

  describe('QueryRequest', () => {
    it('should accept valid query request', () => {
      const request: QueryRequest = {
        sql: 'SELECT * FROM users'
      }
      expect(request.sql).toBe('SELECT * FROM users')
    })
  })

  describe('NaturalQueryRequest', () => {
    it('should accept valid natural query request', () => {
      const request: NaturalQueryRequest = {
        prompt: '显示所有用户'
      }
      expect(request.prompt).toBe('显示所有用户')
    })
  })

  describe('CreateConnectionRequest', () => {
    it('should accept valid connection request', () => {
      const request: CreateConnectionRequest = {
        url: 'postgresql://user:pass@localhost:5432/db'
      }
      expect(request.url).toContain('postgresql://')
    })
  })
})
