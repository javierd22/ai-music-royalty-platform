'use client';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success': {
        return 'bg-green-50 border-green-200 text-green-800';
      }
      case 'error': {
        return 'bg-red-50 border-red-200 text-red-800';
      }
      case 'warning': {
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      }
      case 'info': {
        return 'bg-blue-50 border-blue-200 text-blue-800';
      }
      default: {
        return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': {
        return 'bg-green-500';
      }
      case 'error': {
        return 'bg-red-500';
      }
      case 'warning': {
        return 'bg-yellow-500';
      }
      case 'info': {
        return 'bg-blue-500';
      }
      default: {
        return 'bg-gray-500';
      }
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-xl shadow-lg border transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className={`p-4 rounded-xl border ${getToastStyles()}`}>
        <div className='flex items-center'>
          <div className={`w-2 h-2 rounded-full ${getIconColor()} mr-3`} />
          <p className='text-sm font-medium'>{message}</p>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className='ml-2 text-gray-400 hover:text-gray-600'
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
