import { useCallback, useState } from 'react';

import { Toast, ToastType } from '@/components/Toast';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const newToast: Toast = {
      id: Date.now() + Math.random(),
      type,
      message,
    };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      addToast('success', message);
    },
    [addToast]
  );

  const showError = useCallback(
    (message: string) => {
      addToast('error', message);
    },
    [addToast]
  );

  const showWarning = useCallback(
    (message: string) => {
      addToast('warning', message);
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    dismissToast,
    showSuccess,
    showError,
    showWarning,
  };
}
