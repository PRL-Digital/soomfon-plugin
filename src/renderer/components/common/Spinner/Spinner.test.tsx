/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('should render a spinner element', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeTruthy();
    expect(spinner.getAttribute('aria-label')).toBe('Loading');
  });

  it('should render with default medium size', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status');
    expect(spinner.classList.contains('spinner')).toBe(true);
    expect(spinner.classList.contains('spinner--md')).toBe(true);
  });

  it('should render small size when specified', () => {
    render(<Spinner size="sm" />);

    const spinner = screen.getByRole('status');
    expect(spinner.classList.contains('spinner--sm')).toBe(true);
  });

  it('should render large size when specified', () => {
    render(<Spinner size="lg" />);

    const spinner = screen.getByRole('status');
    expect(spinner.classList.contains('spinner--lg')).toBe(true);
  });

  it('should render text when provided', () => {
    render(<Spinner text="Loading data..." />);

    expect(screen.getByText('Loading data...')).toBeTruthy();
  });

  it('should not render text when not provided', () => {
    render(<Spinner />);

    const container = screen.getByRole('status').parentElement;
    expect(container?.querySelector('.spinner__text')).toBeNull();
  });

  it('should apply custom className', () => {
    render(<Spinner className="custom-class" />);

    const container = screen.getByRole('status').parentElement;
    expect(container?.classList.contains('custom-class')).toBe(true);
  });

  it('should render spinner with text combined', () => {
    render(<Spinner size="lg" text="Please wait..." className="my-spinner" />);

    const spinner = screen.getByRole('status');
    expect(spinner.classList.contains('spinner--lg')).toBe(true);
    expect(screen.getByText('Please wait...')).toBeTruthy();

    const container = spinner.parentElement;
    expect(container?.classList.contains('my-spinner')).toBe(true);
  });
});
