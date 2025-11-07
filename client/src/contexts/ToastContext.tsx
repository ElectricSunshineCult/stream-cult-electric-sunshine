'use client';

import { createContext, useContext, ReactNode } from 'react';
import { toast as hotToast } from 'react-hot-toast';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  loading: (message: string) => string | number;
  dismiss: (toastId: string | number) => void;
  promise: <T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) => Promise<T>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const success = (message: string) => {
    hotToast.success(message, {
      duration: 4000,
      style: {
        background: '#f0fdf4',
        color: '#166534',
        border: '1px solid #bbf7d0',
      },
      iconTheme: {
        primary: '#22c55e',
        secondary: '#f0fdf4',
      },
    });
  };

  const error = (message: string) => {
    hotToast.error(message, {
      duration: 6000,
      style: {
        background: '#fef2f2',
        color: '#991b1b',
        border: '1px solid #fecaca',
      },
      iconTheme: {
        primary: '#ef4444',
        secondary: '#fef2f2',
      },
    });
  };

  const info = (message: string) => {
    hotToast(message, {
      duration: 4000,
      style: {
        background: '#eff6ff',
        color: '#1e40af',
        border: '1px solid #bfdbfe',
      },
      icon: 'ℹ️',
    });
  };

  const warning = (message: string) => {
    hotToast(message, {
      duration: 5000,
      style: {
        background: '#fffbeb',
        color: '#92400e',
        border: '1px solid #fed7aa',
      },
      icon: '⚠️',
    });
  };

  const loading = (message: string) => {
    return hotToast.loading(message, {
      style: {
        background: '#f8fafc',
        color: '#374151',
        border: '1px solid #e5e7eb',
      },
    });
  };

  const dismiss = (toastId: string | number) => {
    hotToast.dismiss(toastId);
  };

  const promise = <T,>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) => {
    return hotToast.promise(promise, messages, {
      style: {
        background: '#f8fafc',
        color: '#374151',
        border: '1px solid #e5e7eb',
      },
      success: {
        duration: 4000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
        },
      },
      error: {
        duration: 6000,
        style: {
          background: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
        },
      },
    });
  };

  const value = {
    success,
    error,
    info,
    warning,
    loading,
    dismiss,
    promise,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}