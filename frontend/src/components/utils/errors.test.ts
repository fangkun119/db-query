import { describe, it, expect } from 'vitest'
import { getApiErrorMessage, handleApiError } from '../../utils/errors'

describe('Error Utils', () => {
  describe('getApiErrorMessage', () => {
    it('should extract detail from error with response', () => {
      const error = {
        response: {
          data: {
            detail: 'Database not found'
          }
        }
      }
      expect(getApiErrorMessage(error)).toBe('Database not found')
    })

    it('should return unknown error when no response', () => {
      const error = {}
      expect(getApiErrorMessage(error)).toBe('Unknown error')
    })

    it('should return unknown error when response has no detail', () => {
      const error = {
        response: {
          data: {}
        }
      }
      expect(getApiErrorMessage(error)).toBe('Unknown error')
    })

    it('should return unknown error for non-object errors', () => {
      expect(getApiErrorMessage('string error')).toBe('Unknown error')
      expect(getApiErrorMessage(null)).toBe('Unknown error')
      expect(getApiErrorMessage(undefined)).toBe('Unknown error')
    })
  })

  describe('handleApiError', () => {
    it('should include detail in message when available', () => {
      const error = {
        response: {
          data: {
            detail: 'Connection failed'
          }
        }
      }
      expect(handleApiError(error, '操作失败')).toBe('操作失败：Connection failed')
    })

    it('should return fallback message when detail is unknown', () => {
      const error = {}
      expect(handleApiError(error, '操作失败')).toBe('操作失败')
    })

    it('should use default fallback message', () => {
      expect(handleApiError({}, 'Custom fallback')).toBe('Custom fallback')
    })
  })
})
