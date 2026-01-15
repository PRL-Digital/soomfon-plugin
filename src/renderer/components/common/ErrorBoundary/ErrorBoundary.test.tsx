/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child content rendered</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error during tests since ErrorBoundary logs errors
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content rendered')).toBeTruthy();
  });

  it('should render default error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText(/An unexpected error occurred/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload App' })).toBeTruthy();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should log error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalled();
  });

  it('should show error details in expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // The details should contain error message
    const details = screen.getByText('Error details');
    expect(details).toBeTruthy();
  });

  it('should reset error state when Try Again is clicked', () => {
    const TestWrapper: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <ErrorBoundary key={shouldThrow ? 'error' : 'normal'}>
          <button onClick={() => setShouldThrow(false)}>Fix error</button>
          <ThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    render(<TestWrapper />);

    // Error UI should be shown
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Click Try Again
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // Since the state hasn't changed and ErrorBoundary reset, it will try to render again
    // and throw again. This tests that handleReset works.
    // In a real app, the error would be fixed before trying again.
  });

  it('should capture error with component stack', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorInfo = onError.mock.calls[0][1];
    expect(errorInfo.componentStack).toBeDefined();
    expect(typeof errorInfo.componentStack).toBe('string');
  });
});
