'use client';

import { useEffect } from 'react';

import { useToast } from '@/hooks/useToast';
import { validateSupabaseConfig } from '@/lib/utils';

export function EnvCheck() {
  const { showWarning } = useToast();

  useEffect(() => {
    const configCheck = validateSupabaseConfig();
    if (!configCheck.isValid) {
      showWarning(
        `Configuration issue: ${configCheck.error}. Some features may not work properly.`
      );
    }
  }, [showWarning]);

  return null; // This component doesn't render anything
}
