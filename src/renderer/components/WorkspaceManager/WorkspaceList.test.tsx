/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkspaceList, { WorkspaceListProps } from './WorkspaceList';
import type { Workspace } from '@shared/types/config';

describe('WorkspaceList', () => {
  let mockOnWorkspaceSelect: ReturnType<typeof vi.fn>;
  let mockOnWorkspaceCreate: ReturnType<typeof vi.fn>;
  let mockOnWorkspaceRename: ReturnType<typeof vi.fn>;
  let mockOnWorkspaceDuplicate: ReturnType<typeof vi.fn>;
  let mockOnWorkspaceDelete: ReturnType<typeof vi.fn>;

  const mockWorkspaces: Workspace[] = [
    {
      id: 'ws-1',
      name: 'Default',
      buttons: [{ index: 0 }, { index: 1 }],
      encoders: [{ index: 0 }],
    },
    {
      id: 'ws-2',
      name: 'Work',
      buttons: [{ index: 0 }],
      encoders: [],
    },
    {
      id: 'ws-3',
      name: 'Gaming',
      buttons: [],
      encoders: [{ index: 0 }, { index: 1 }, { index: 2 }],
    },
  ];

  beforeEach(() => {
    mockOnWorkspaceSelect = vi.fn();
    mockOnWorkspaceCreate = vi.fn();
    mockOnWorkspaceRename = vi.fn();
    mockOnWorkspaceDuplicate = vi.fn();
    mockOnWorkspaceDelete = vi.fn();
  });

  const renderList = (props: Partial<WorkspaceListProps> = {}) => {
    return render(
      <WorkspaceList
        workspaces={mockWorkspaces}
        activeWorkspaceIndex={0}
        onWorkspaceSelect={mockOnWorkspaceSelect}
        onWorkspaceCreate={mockOnWorkspaceCreate}
        onWorkspaceRename={mockOnWorkspaceRename}
        onWorkspaceDuplicate={mockOnWorkspaceDuplicate}
        onWorkspaceDelete={mockOnWorkspaceDelete}
        {...props}
      />
    );
  };

  describe('rendering', () => {
    it('should render the workspace list', () => {
      renderList();
      expect(screen.getByTestId('workspace-list')).toBeTruthy();
    });

    it('should render all workspaces', () => {
      renderList();
      expect(screen.getByTestId('workspace-item-0')).toBeTruthy();
      expect(screen.getByTestId('workspace-item-1')).toBeTruthy();
      expect(screen.getByTestId('workspace-item-2')).toBeTruthy();
    });

    it('should render workspace names', () => {
      renderList();
      expect(screen.getByText('Default')).toBeTruthy();
      expect(screen.getByText('Work')).toBeTruthy();
      expect(screen.getByText('Gaming')).toBeTruthy();
    });

    it('should render button and encoder counts', () => {
      renderList();
      expect(screen.getByText('2 buttons')).toBeTruthy();
      expect(screen.getByText('1 encoder')).toBeTruthy();
      expect(screen.getByText('1 button')).toBeTruthy();
      expect(screen.getByText('0 encoders')).toBeTruthy();
      expect(screen.getByText('0 buttons')).toBeTruthy();
      expect(screen.getByText('3 encoders')).toBeTruthy();
    });

    it('should show title', () => {
      renderList();
      expect(screen.getByText('Workspaces')).toBeTruthy();
    });

    it('should render create button', () => {
      renderList();
      expect(screen.getByTestId('workspace-create-btn')).toBeTruthy();
    });
  });

  describe('active workspace', () => {
    it('should highlight active workspace', () => {
      renderList({ activeWorkspaceIndex: 1 });
      const item = screen.getByTestId('workspace-item-1');
      expect(item.classList.contains('workspace-list__item--active')).toBe(true);
    });

    it('should show active badge on active workspace', () => {
      renderList({ activeWorkspaceIndex: 0 });
      expect(screen.getByTestId('workspace-active-badge')).toBeTruthy();
    });

    it('should not show active badge on inactive workspaces', () => {
      renderList({ activeWorkspaceIndex: 2 });
      // There should be only one active badge
      const badges = document.querySelectorAll('[data-testid="workspace-active-badge"]');
      expect(badges.length).toBe(1);
    });
  });

  describe('workspace selection', () => {
    it('should call onWorkspaceSelect when workspace item is clicked', () => {
      renderList();

      fireEvent.click(screen.getByTestId('workspace-item-1'));
      expect(mockOnWorkspaceSelect).toHaveBeenCalledWith(1);
    });

    it('should call onWorkspaceSelect with correct index', () => {
      renderList();

      fireEvent.click(screen.getByTestId('workspace-item-2'));
      expect(mockOnWorkspaceSelect).toHaveBeenCalledWith(2);
    });
  });

  describe('action buttons', () => {
    it('should render action buttons for each workspace', () => {
      renderList();
      expect(screen.getByTestId('workspace-rename-btn-0')).toBeTruthy();
      expect(screen.getByTestId('workspace-duplicate-btn-0')).toBeTruthy();
      expect(screen.getByTestId('workspace-delete-btn-0')).toBeTruthy();
    });

    it('should call onWorkspaceRename with workspace when rename button is clicked', () => {
      renderList();

      fireEvent.click(screen.getByTestId('workspace-rename-btn-1'));
      expect(mockOnWorkspaceRename).toHaveBeenCalledWith(mockWorkspaces[1]);
    });

    it('should call onWorkspaceDuplicate with workspace when duplicate button is clicked', () => {
      renderList();

      fireEvent.click(screen.getByTestId('workspace-duplicate-btn-0'));
      expect(mockOnWorkspaceDuplicate).toHaveBeenCalledWith(mockWorkspaces[0]);
    });

    it('should call onWorkspaceDelete with workspace when delete button is clicked', () => {
      renderList();

      fireEvent.click(screen.getByTestId('workspace-delete-btn-2'));
      expect(mockOnWorkspaceDelete).toHaveBeenCalledWith(mockWorkspaces[2]);
    });

    it('should not trigger workspace select when action buttons are clicked', () => {
      renderList();

      fireEvent.click(screen.getByTestId('workspace-rename-btn-1'));
      fireEvent.click(screen.getByTestId('workspace-duplicate-btn-1'));
      fireEvent.click(screen.getByTestId('workspace-delete-btn-1'));

      expect(mockOnWorkspaceSelect).not.toHaveBeenCalled();
    });
  });

  describe('create workspace', () => {
    it('should call onWorkspaceCreate when create button is clicked', () => {
      renderList();

      fireEvent.click(screen.getByTestId('workspace-create-btn'));
      expect(mockOnWorkspaceCreate).toHaveBeenCalled();
    });
  });

  describe('delete button disabled state', () => {
    it('should disable delete button when only one workspace exists', () => {
      renderList({
        workspaces: [mockWorkspaces[0]],
      });

      const deleteBtn = screen.getByTestId('workspace-delete-btn-0') as HTMLButtonElement;
      expect(deleteBtn.disabled).toBe(true);
    });

    it('should enable delete button when multiple workspaces exist', () => {
      renderList();

      const deleteBtn = screen.getByTestId('workspace-delete-btn-0') as HTMLButtonElement;
      expect(deleteBtn.disabled).toBe(false);
    });
  });

  describe('loading state', () => {
    it('should show loading state when isLoading is true', () => {
      renderList({ isLoading: true });
      expect(screen.getByTestId('workspace-list-loading')).toBeTruthy();
      expect(screen.getByText('Loading workspaces...')).toBeTruthy();
    });

    it('should not show workspace items when loading', () => {
      renderList({ isLoading: true });
      expect(screen.queryByTestId('workspace-item-0')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no workspaces', () => {
      renderList({ workspaces: [] });
      expect(screen.getByText('No workspaces found.')).toBeTruthy();
    });

    it('should show create button in empty state', () => {
      renderList({ workspaces: [] });
      const createBtn = screen.getByText('Create your first workspace');
      expect(createBtn).toBeTruthy();
    });

    it('should call onWorkspaceCreate from empty state create button', () => {
      renderList({ workspaces: [] });

      fireEvent.click(screen.getByText('Create your first workspace'));
      expect(mockOnWorkspaceCreate).toHaveBeenCalled();
    });
  });

  describe('pluralization', () => {
    it('should use singular "button" for 1 button', () => {
      renderList({
        workspaces: [{ id: 'ws-1', name: 'Test', buttons: [{ index: 0 }], encoders: [] }],
      });
      expect(screen.getByText('1 button')).toBeTruthy();
    });

    it('should use plural "buttons" for 0 buttons', () => {
      renderList({
        workspaces: [{ id: 'ws-1', name: 'Test', buttons: [], encoders: [] }],
      });
      expect(screen.getByText('0 buttons')).toBeTruthy();
    });

    it('should use plural "buttons" for multiple buttons', () => {
      renderList({
        workspaces: [{ id: 'ws-1', name: 'Test', buttons: [{ index: 0 }, { index: 1 }], encoders: [] }],
      });
      expect(screen.getByText('2 buttons')).toBeTruthy();
    });

    it('should use singular "encoder" for 1 encoder', () => {
      renderList({
        workspaces: [{ id: 'ws-1', name: 'Test', buttons: [], encoders: [{ index: 0 }] }],
      });
      expect(screen.getByText('1 encoder')).toBeTruthy();
    });

    it('should use plural "encoders" for 0 encoders', () => {
      renderList({
        workspaces: [{ id: 'ws-1', name: 'Test', buttons: [], encoders: [] }],
      });
      expect(screen.getByText('0 encoders')).toBeTruthy();
    });

    it('should use plural "encoders" for multiple encoders', () => {
      renderList({
        workspaces: [{ id: 'ws-1', name: 'Test', buttons: [], encoders: [{ index: 0 }, { index: 1 }] }],
      });
      expect(screen.getByText('2 encoders')).toBeTruthy();
    });
  });
});
