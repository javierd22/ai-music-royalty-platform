'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: number) => void;
}

export function ToastComponent({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm border ${getToastStyles()}`}
    >
      <div className='flex items-center'>
        <div className={`w-2 h-2 rounded-full mr-3 ${getIconColor()}`}></div>
        <p className='text-sm font-medium flex-1'>{toast.message}</p>
        <button
          onClick={() => onDismiss(toast.id)}
          className='ml-2 text-gray-400 hover:text-gray-600'
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <>
      {toasts.map(toast => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </>
  );
}
