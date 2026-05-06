import { describe, it, expect } from 'vitest'
import { getApiErrorMessage, handleApiError } from '../../utils/errors'
import axios from 'axios'

// Create a proper AxiosError-like object
function createAxiosError(detail?: string) {
  const error = new Error('Axios error') as any;
  error.isAxiosError = true;
  error.response = {
    data: {
      detail: detail ?? 'Database not found'
    }
  };
  return error;
}

describe('Error Utils', () => {
  describe('getApiErrorMessage', () => {
    it('should extract detail from Axios error with response', () => {
      const error = createAxiosError('Database not found');
      expect(getApiErrorMessage(error)).toBe('Database not found');
    })

    it('should return unknown error when Axios error has no detail', () => {
      const error = createAxiosError();
      error.response.data = {};
      expect(getApiErrorMessage(error)).toBe('Unknown error');
    })

    it('should return unknown error for non-Axios errors', () => {
      expect(getApiErrorMessage('string error')).toBe('Unknown error');
      expect(getApiErrorMessage(null)).toBe('Unknown error');
      expect(getApiErrorMessage(undefined)).toBe('Unknown error');
    })
  })

  describe('handleApiError', () => {
    it('should include detail in message when available', () => {
      const error = createAxiosError('Connection failed');
      expect(handleApiError(error, '操作失败')).toBe('操作失败: Connection failed');
    })

    it('should return fallback message when detail is unknown', () => {
      const error = createAxiosError();
      error.response.data = {};
      expect(handleApiError(error, '操作失败')).toBe('操作失败');
    })

    it('should use default fallback message', () => {
      expect(handleApiError({}, 'Custom fallback')).toBe('Custom fallback');
    })
  })
})
