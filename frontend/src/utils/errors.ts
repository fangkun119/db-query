interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as ApiError;
    return err.response?.data?.detail || 'Unknown error';
  }
  return 'Unknown error';
}

export function handleApiError(error: unknown, fallbackMessage: string = '操作失败'): string {
  const message = getApiErrorMessage(error);
  return message !== 'Unknown error' ? `${fallbackMessage}：${message}` : fallbackMessage;
}
