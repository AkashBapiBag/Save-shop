import { Alert } from 'react-native';
import { APIError } from '@/services/api';

export interface FormattedError {
  title: string;
  message: string;
  code?: string;
  status?: number;
}

/**
 * Standard parser to extract a human-friendly message from any error object.
 */
export function getErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred'): string {
  if (!error) return fallbackMessage;

  if (error instanceof APIError) {
    return error.message || fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === 'string') return errObj.message;
    if (typeof errObj.detail === 'string') return errObj.detail;
  }

  return fallbackMessage;
}

/**
 * Standard parser to extract full structured error details.
 */
export function formatError(error: unknown, defaultTitle = 'Error'): FormattedError {
  if (error instanceof APIError) {
    let title = defaultTitle;
    if (error.code === 'TIMEOUT_ERROR') {
      title = 'Request Timed Out';
    } else if (error.code === 'NETWORK_ERROR' || error.status === 0) {
      title = 'Network Connection Error';
    } else if (error.status === 401 || error.status === 403) {
      title = 'Access Denied';
    } else if (error.status === 404) {
      title = 'Resource Not Found';
    } else if (error.status === 422) {
      title = 'Validation Failed';
    }

    return {
      title,
      message: error.message,
      code: error.code,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      title: defaultTitle,
      message: error.message,
    };
  }

  return {
    title: defaultTitle,
    message: typeof error === 'string' ? error : 'An unexpected error occurred',
  };
}

/**
 * Display a standardized user-facing alert with title, message, and optional action buttons.
 */
export function showErrorAlert(
  error: unknown,
  customTitle?: string,
  fallbackMessage = 'Please verify connection and try again.'
): void {
  const parsed = formatError(error, customTitle || 'Operation Failed');
  const message = parsed.message || fallbackMessage;
  Alert.alert(parsed.title, message);
}

/**
 * Safe logging helper that logs in development with context.
 */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[${context}]`, error);
  }
}
