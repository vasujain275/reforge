// API error response type for type-safe error handling
export interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      error?: {
        message?: string;
      };
    };
    status?: number;
  };
}

// Helper function to extract error message from API error
export function getApiErrorMessage(err: unknown, defaultMessage: string): string {
  const error = err as ApiErrorResponse;
  return error?.response?.data?.message || defaultMessage;
}

// Helper for errors with nested error.message structure
export function getNestedApiErrorMessage(err: unknown, defaultMessage: string): string {
  const error = err as ApiErrorResponse;
  return error?.response?.data?.error?.message || 
         error?.response?.data?.message || 
         defaultMessage;
}
