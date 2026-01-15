import React from 'react';
import { useToast, ToastType } from './ToastContext';

const getToastIcon = (type: ToastType): string => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
    default:
      return 'ℹ';
  }
};

const getToastClassName = (type: ToastType): string => {
  switch (type) {
    case 'success':
      return 'toast--success';
    case 'error':
      return 'toast--error';
    case 'warning':
      return 'toast--warning';
    case 'info':
      return 'toast--info';
    default:
      return 'toast--info';
  }
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${getToastClassName(toast.type)}`}
          role="alert"
        >
          <span className="toast__icon">{getToastIcon(toast.type)}</span>
          <span className="toast__message">{toast.message}</span>
          <button
            className="toast__close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
