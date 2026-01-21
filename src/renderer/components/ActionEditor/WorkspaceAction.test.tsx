/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceActionForm } from './WorkspaceAction';
import type { WorkspaceAction } from '@shared/types/actions';

describe('WorkspaceActionForm', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockGetActive: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockGetActive = vi.fn();

    // Setup default mock API
    (window as unknown as { tauriAPI?: unknown }).tauriAPI = {
      profiles: {
        getActive: mockGetActive,
      },
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete (window as unknown as { tauriAPI?: unknown }).tauriAPI;
  });

  describe('rendering', () => {
    it('should render the form with data-testid', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [] });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'next' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('workspace-action-form')).toBeTruthy();
    });

    it('should render direction select with all options', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [] });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'next' }}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByTestId('workspace-direction-select');
      expect(select).toBeTruthy();

      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(3);
      expect(options[0].value).toBe('next');
      expect(options[1].value).toBe('previous');
      expect(options[2].value).toBe('specific');
    });

    it('should show correct description hint for each direction', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [] });

      const { rerender } = render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'next' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Navigate to the next workspace (wraps around)')).toBeTruthy();

      rerender(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'previous' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Navigate to the previous workspace (wraps around)')).toBeTruthy();

      rerender(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Navigate to a specific workspace by index')).toBeTruthy();
    });

    it('should default to next direction when not provided', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [] });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace' } as Partial<WorkspaceAction>}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByTestId('workspace-direction-select') as HTMLSelectElement;
      expect(select.value).toBe('next');
    });
  });

  describe('direction change', () => {
    it('should call onChange when direction changes to previous', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [] });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'next' }}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByTestId('workspace-direction-select');
      fireEvent.change(select, { target: { value: 'previous' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'workspace',
        direction: 'previous',
      });
    });

    it('should call onChange when direction changes to specific', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [] });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'next' }}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByTestId('workspace-direction-select');
      fireEvent.change(select, { target: { value: 'specific' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'workspace',
        direction: 'specific',
      });
    });

    it('should clear workspaceIndex when changing from specific to other direction', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [] });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific', workspaceIndex: 2 }}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByTestId('workspace-direction-select');
      fireEvent.change(select, { target: { value: 'next' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'workspace',
        direction: 'next',
      });
      // workspaceIndex should not be in the result
      expect(mockOnChange.mock.calls[0][0].workspaceIndex).toBeUndefined();
    });
  });

  describe('workspace selection (specific direction)', () => {
    it('should not show workspace select for next direction', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [{ id: '1', name: 'Workspace 1' }] });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'next' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('workspace-index-select')).toBeNull();
      });
    });

    it('should not show workspace select for previous direction', async () => {
      mockGetActive.mockResolvedValue({ workspaces: [{ id: '1', name: 'Workspace 1' }] });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'previous' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('workspace-index-select')).toBeNull();
      });
    });

    it('should show workspace select for specific direction', async () => {
      mockGetActive.mockResolvedValue({
        workspaces: [
          { id: '1', name: 'Main' },
          { id: '2', name: 'Work' },
        ],
      });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-index-select')).toBeTruthy();
      });

      const select = screen.getByTestId('workspace-index-select');
      const options = select.querySelectorAll('option');
      // 1 placeholder + 2 workspaces = 3 options
      expect(options).toHaveLength(3);
      expect(options[1].textContent).toBe('Main');
      expect(options[2].textContent).toBe('Work');
    });

    it('should call onChange when workspace is selected', async () => {
      mockGetActive.mockResolvedValue({
        workspaces: [
          { id: '1', name: 'Main' },
          { id: '2', name: 'Work' },
        ],
      });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-index-select')).toBeTruthy();
      });

      const select = screen.getByTestId('workspace-index-select');
      fireEvent.change(select, { target: { value: '1' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'workspace',
        direction: 'specific',
        workspaceIndex: 1,
      });
    });

    it('should show selected workspace value', async () => {
      mockGetActive.mockResolvedValue({
        workspaces: [
          { id: '1', name: 'Main' },
          { id: '2', name: 'Work' },
        ],
      });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific', workspaceIndex: 1 }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        const select = screen.getByTestId('workspace-index-select') as HTMLSelectElement;
        expect(select.value).toBe('1');
      });
    });
  });

  describe('loading state', () => {
    it('should show loading text while loading workspaces', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void = () => {};
      const loadPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetActive.mockReturnValue(loadPromise);

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Loading workspaces...')).toBeTruthy();

      // Resolve the promise and let the component finish loading
      resolvePromise({ workspaces: [] });

      await waitFor(() => {
        expect(screen.queryByText('Loading workspaces...')).toBeNull();
      });
    });
  });

  describe('error handling', () => {
    it('should show error when API is not available', async () => {
      (window as unknown as { tauriAPI?: unknown }).tauriAPI = undefined;

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-load-error')).toBeTruthy();
        expect(screen.getByText('Profile API not available')).toBeTruthy();
      });
    });

    it('should show error when API call fails', async () => {
      mockGetActive.mockRejectedValue(new Error('Network error'));

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-load-error')).toBeTruthy();
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });

    it('should show generic error for non-Error rejections', async () => {
      mockGetActive.mockRejectedValue('Unknown error');

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-load-error')).toBeTruthy();
        expect(screen.getByText('Failed to load workspaces')).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('should use default workspace when profile has no workspaces', async () => {
      mockGetActive.mockResolvedValue({ workspaces: null });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-index-select')).toBeTruthy();
      });

      const select = screen.getByTestId('workspace-index-select');
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(2); // placeholder + Default Workspace
      expect(options[1].textContent).toBe('Default Workspace');
    });

    it('should use default name for workspaces without names', async () => {
      mockGetActive.mockResolvedValue({
        workspaces: [
          { id: '1', name: '' },
          { id: '2', name: null as unknown as string },
        ],
      });

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        const select = screen.getByTestId('workspace-index-select');
        const options = select.querySelectorAll('option');
        expect(options[1].textContent).toBe('Workspace 1');
        expect(options[2].textContent).toBe('Workspace 2');
      });
    });

    it('should handle null profile response', async () => {
      mockGetActive.mockResolvedValue(null);

      render(
        <WorkspaceActionForm
          config={{ type: 'workspace', direction: 'specific' }}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-index-select')).toBeTruthy();
        const select = screen.getByTestId('workspace-index-select');
        const options = select.querySelectorAll('option');
        expect(options[1].textContent).toBe('Default Workspace');
      });
    });
  });
});
