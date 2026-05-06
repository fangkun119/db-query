import axios from 'axios';

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail ?? 'Unknown error';
  }
  return 'Unknown error';
}

export function handleApiError(error: unknown, fallbackMessage: string = 'Operation failed'): string {
  const message = getApiErrorMessage(error);
  return message !== 'Unknown error' ? `${fallbackMessage}: ${message}` : fallbackMessage;
}
