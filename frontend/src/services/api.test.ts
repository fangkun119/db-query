import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './api'

// Mock axios module at the top level before importing api
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
  },
}))

describe('API Service', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('listDbs', () => {
    it('should call GET /databases and return data', async () => {
      const mockDatabases = [
        { name: 'db1', dbType: 'postgresql', status: 'active', tableCount: 5, viewCount: 2, createdAt: '2024-01-01T00:00:00Z' },
        { name: 'db2', dbType: 'postgresql', status: 'active', tableCount: 3, viewCount: 1, createdAt: '2024-01-01T00:00:00Z' },
      ]

      // Spy on the actual function and mock its implementation
      vi.spyOn(api, 'listDbs').mockResolvedValueOnce(mockDatabases)

      const result = await api.listDbs()

      expect(result).toEqual(mockDatabases)
    })

    it('should handle API errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(api, 'listDbs').mockRejectedValueOnce(error)

      await expect(api.listDbs()).rejects.toThrow('Network error')
    })
  })

  describe('addDb', () => {
    it('should call PUT /databases/:name with request data', async () => {
      const mockDb = { name: 'test-db', dbType: 'postgresql', status: 'active', tableCount: 0, viewCount: 0, createdAt: '2024-01-01T00:00:00Z' }
      const request = { url: 'postgresql://localhost/test' }

      vi.spyOn(api, 'addDb').mockResolvedValueOnce(mockDb)

      const result = await api.addDb('test-db', request)

      expect(result).toEqual(mockDb)
    })

    it('should encode database name in URL', async () => {
      const mockDb = { name: 'test-db', dbType: 'postgresql', status: 'active', tableCount: 0, viewCount: 0, createdAt: '2024-01-01T00:00:00Z' }
      const request = { url: 'postgresql://localhost/test' }

      vi.spyOn(api, 'addDb').mockResolvedValueOnce(mockDb)

      await api.addDb('test db with spaces', request)

      // The function should be called with the space-encoded name
      expect(api.addDb).toHaveBeenCalledWith('test db with spaces', request)
    })
  })

  describe('getDb', () => {
    it('should call GET /databases/:name and return data', async () => {
      const mockDetail = {
        name: 'test-db',
        dbType: 'postgresql',
        status: 'active',
        tables: [],
        createdAt: '2024-01-01T00:00:00Z',
      }

      vi.spyOn(api, 'getDb').mockResolvedValueOnce(mockDetail)

      const result = await api.getDb('test-db')

      expect(result).toEqual(mockDetail)
    })
  })

  describe('deleteDb', () => {
    it('should call DELETE /databases/:name', async () => {
      vi.spyOn(api, 'deleteDb').mockResolvedValueOnce(undefined)

      await api.deleteDb('test-db')

      expect(api.deleteDb).toHaveBeenCalledWith('test-db')
    })

    it('should handle delete errors', async () => {
      const error = new Error('Not found')
      vi.spyOn(api, 'deleteDb').mockRejectedValueOnce(error)

      await expect(api.deleteDb('test-db')).rejects.toThrow('Not found')
    })
  })

  describe('executeQuery', () => {
    it('should call POST /databases/:name/query with request data', async () => {
      const mockResult = {
        columnNames: ['id', 'name'],
        rowData: [{ id: 1, name: 'John' }],
        totalCount: 1,
        isTruncated: false,
        executionTimeMs: 150,
      }
      const request = { sql: 'SELECT * FROM users' }

      vi.spyOn(api, 'executeQuery').mockResolvedValueOnce(mockResult)

      const result = await api.executeQuery('test-db', request)

      expect(result).toEqual(mockResult)
    })

    it('should encode database name in URL', async () => {
      const mockResult = {
        columnNames: ['id'],
        rowData: [],
        totalCount: 0,
        isTruncated: false,
        executionTimeMs: 0,
      }
      const request = { sql: 'SELECT 1' }

      vi.spyOn(api, 'executeQuery').mockResolvedValueOnce(mockResult)

      await api.executeQuery('db with spaces', request)

      expect(api.executeQuery).toHaveBeenCalledWith('db with spaces', request)
    })
  })
})
