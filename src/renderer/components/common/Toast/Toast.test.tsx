/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from './ToastContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useToast hook', () => {
    it('should throw error when used outside ToastProvider', () => {
      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');
    });

    it('should provide toast context when used within ToastProvider', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      expect(result.current).toHaveProperty('toasts');
      expect(result.current).toHaveProperty('addToast');
      expect(result.current).toHaveProperty('removeToast');
      expect(result.current).toHaveProperty('success');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('warning');
      expect(result.current).toHaveProperty('info');
    });
  });

  describe('addToast', () => {
    it('should add a toast to the list', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.addToast('success', 'Test message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[0].message).toBe('Test message');
    });

    it('should auto-remove toast after duration', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.addToast('info', 'Test message', 1000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should limit toasts to MAX_TOASTS (5)', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        for (let i = 0; i < 7; i++) {
          result.current.addToast('info', `Message ${i}`, 0); // duration 0 = no auto-remove
        }
      });

      // Should only have 5 toasts (MAX_TOASTS)
      expect(result.current.toasts).toHaveLength(5);
      // First two toasts should be removed, keeping the last 5
      expect(result.current.toasts[0].message).toBe('Message 2');
      expect(result.current.toasts[4].message).toBe('Message 6');
    });
  });

  describe('removeToast', () => {
    it('should remove a toast by id', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.addToast('info', 'Test message', 0);
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.removeToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('convenience methods', () => {
    it('should add success toast', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.success('Success message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[0].message).toBe('Success message');
    });

    it('should add error toast with longer duration', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.error('Error message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('error');
      expect(result.current.toasts[0].message).toBe('Error message');

      // Error toasts default to 6000ms
      act(() => {
        vi.advanceTimersByTime(5999);
      });
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should add warning toast', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.warning('Warning message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('warning');
      expect(result.current.toasts[0].message).toBe('Warning message');
    });

    it('should add info toast', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.info('Info message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('info');
      expect(result.current.toasts[0].message).toBe('Info message');
    });
  });

  describe('toast ID uniqueness', () => {
    it('should generate unique IDs for each toast', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.addToast('info', 'Message 1', 0);
        result.current.addToast('info', 'Message 2', 0);
        result.current.addToast('info', 'Message 3', 0);
      });

      const ids = result.current.toasts.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });
});
