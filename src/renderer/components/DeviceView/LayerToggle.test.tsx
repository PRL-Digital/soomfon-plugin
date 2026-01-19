/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayerToggle, LayerType } from './LayerToggle';

describe('LayerToggle', () => {
  it('renders both Primary and Shift buttons', () => {
    const onChange = vi.fn();
    render(<LayerToggle selected="primary" onChange={onChange} />);

    expect(screen.getByTestId('layer-toggle-primary')).toBeTruthy();
    expect(screen.getByTestId('layer-toggle-shift')).toBeTruthy();
  });

  it('highlights Primary button when primary is selected', () => {
    const onChange = vi.fn();
    render(<LayerToggle selected="primary" onChange={onChange} />);

    const primaryBtn = screen.getByTestId('layer-toggle-primary');
    const shiftBtn = screen.getByTestId('layer-toggle-shift');

    expect(primaryBtn.classList.contains('layer-toggle__btn--active')).toBe(true);
    expect(shiftBtn.classList.contains('layer-toggle__btn--active')).toBe(false);
  });

  it('highlights Shift button when shift is selected', () => {
    const onChange = vi.fn();
    render(<LayerToggle selected="shift" onChange={onChange} />);

    const primaryBtn = screen.getByTestId('layer-toggle-primary');
    const shiftBtn = screen.getByTestId('layer-toggle-shift');

    expect(primaryBtn.classList.contains('layer-toggle__btn--active')).toBe(false);
    expect(shiftBtn.classList.contains('layer-toggle__btn--active')).toBe(true);
  });

  it('calls onChange with "primary" when Primary button is clicked', () => {
    const onChange = vi.fn();
    render(<LayerToggle selected="shift" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('layer-toggle-primary'));

    expect(onChange).toHaveBeenCalledWith('primary');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with "shift" when Shift button is clicked', () => {
    const onChange = vi.fn();
    render(<LayerToggle selected="primary" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('layer-toggle-shift'));

    expect(onChange).toHaveBeenCalledWith('shift');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-pressed attributes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<LayerToggle selected="primary" onChange={onChange} />);

    expect(screen.getByTestId('layer-toggle-primary').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('layer-toggle-shift').getAttribute('aria-pressed')).toBe('false');

    rerender(<LayerToggle selected="shift" onChange={onChange} />);

    expect(screen.getByTestId('layer-toggle-primary').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('layer-toggle-shift').getAttribute('aria-pressed')).toBe('true');
  });

  it('renders shift icon in Shift button', () => {
    const onChange = vi.fn();
    render(<LayerToggle selected="primary" onChange={onChange} />);

    const shiftBtn = screen.getByTestId('layer-toggle-shift');
    expect(shiftBtn.querySelector('.layer-toggle__shift-icon')).toBeTruthy();
  });
});
