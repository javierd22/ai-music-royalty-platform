// Utility functions for stability checks and error handling

export function validateSupabaseConfig(): { isValid: boolean; error?: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url === 'https://placeholder.supabase.co') {
    return { isValid: false, error: 'Supabase URL not configured' };
  }

  if (!anonKey || anonKey === 'placeholder-key') {
    return { isValid: false, error: 'Supabase anon key not configured' };
  }

  return { isValid: true };
}

export function logSupabaseError(operation: string, error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`Supabase ${operation} error:`, {
    message: (error as { message?: string })?.message || 'Unknown error',
    details: (error as { details?: string })?.details || null,
    hint: (error as { hint?: string })?.hint || null,
    code: (error as { code?: string })?.code || null,
  });
}

export function formatErrorForUser(error: unknown): string {
  if ((error as { message?: string })?.message) {
    return (error as { message: string }).message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function createToastMessage(type: 'success' | 'error' | 'warning', message: string) {
  return { type, message, id: Date.now() + Math.random() };
}
