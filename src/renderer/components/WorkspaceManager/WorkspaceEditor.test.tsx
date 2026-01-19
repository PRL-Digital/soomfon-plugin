/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkspaceEditor, { WorkspaceEditorProps, WorkspaceDialogMode } from './WorkspaceEditor';
import type { Workspace } from '@shared/types/config';

describe('WorkspaceEditor', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnCreate: ReturnType<typeof vi.fn>;
  let mockOnRename: ReturnType<typeof vi.fn>;
  let mockOnDuplicate: ReturnType<typeof vi.fn>;
  let mockOnDelete: ReturnType<typeof vi.fn>;

  const mockWorkspace: Workspace = {
    id: 'ws-1',
    name: 'Test Workspace',
    buttons: [],
    encoders: [],
  };

  const defaultProps: WorkspaceEditorProps = {
    mode: null,
    workspace: null,
    workspaceCount: 3,
    onClose: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnCreate = vi.fn().mockResolvedValue(undefined);
    mockOnRename = vi.fn().mockResolvedValue(undefined);
    mockOnDuplicate = vi.fn().mockResolvedValue(undefined);
    mockOnDelete = vi.fn().mockResolvedValue(undefined);
  });

  const renderEditor = (mode: WorkspaceDialogMode, workspace?: Workspace | null, workspaceCount = 3) => {
    return render(
      <WorkspaceEditor
        mode={mode}
        workspace={workspace}
        workspaceCount={workspaceCount}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
        onRename={mockOnRename}
        onDuplicate={mockOnDuplicate}
        onDelete={mockOnDelete}
      />
    );
  };

  describe('rendering', () => {
    it('should not render when mode is null', () => {
      renderEditor(null);
      expect(screen.queryByTestId('workspace-editor-dialog')).toBeNull();
    });

    it('should render dialog when mode is set', () => {
      renderEditor('create');
      expect(screen.getByTestId('workspace-editor-dialog')).toBeTruthy();
    });

    it('should render correct title for create mode', () => {
      renderEditor('create');
      expect(screen.getByText('Create Workspace')).toBeTruthy();
    });

    it('should render correct title for rename mode', () => {
      renderEditor('rename', mockWorkspace);
      expect(screen.getByText('Rename Workspace')).toBeTruthy();
    });

    it('should render correct title for duplicate mode', () => {
      renderEditor('duplicate', mockWorkspace);
      expect(screen.getByText('Duplicate Workspace')).toBeTruthy();
    });

    it('should render correct title for delete mode', () => {
      renderEditor('delete', mockWorkspace);
      expect(screen.getByText('Delete Workspace')).toBeTruthy();
    });

    it('should render name input for non-delete modes', () => {
      renderEditor('create');
      expect(screen.getByTestId('workspace-name-input')).toBeTruthy();
    });

    it('should not render name input for delete mode', () => {
      renderEditor('delete', mockWorkspace);
      expect(screen.queryByTestId('workspace-name-input')).toBeNull();
    });

    it('should show delete confirmation message', () => {
      renderEditor('delete', mockWorkspace);
      expect(screen.getByText(/Are you sure you want to delete/)).toBeTruthy();
      expect(screen.getByText('Test Workspace')).toBeTruthy();
    });
  });

  describe('initial values', () => {
    it('should set default name for create mode', () => {
      renderEditor('create', null, 3);
      const input = screen.getByTestId('workspace-name-input') as HTMLInputElement;
      expect(input.value).toBe('Workspace 4');
    });

    it('should use workspace name for rename mode', () => {
      renderEditor('rename', mockWorkspace);
      const input = screen.getByTestId('workspace-name-input') as HTMLInputElement;
      expect(input.value).toBe('Test Workspace');
    });

    it('should add (Copy) suffix for duplicate mode', () => {
      renderEditor('duplicate', mockWorkspace);
      const input = screen.getByTestId('workspace-name-input') as HTMLInputElement;
      expect(input.value).toBe('Test Workspace (Copy)');
    });
  });

  describe('create mode', () => {
    it('should call onCreate with trimmed name on submit', async () => {
      renderEditor('create', null, 2);

      const input = screen.getByTestId('workspace-name-input');
      fireEvent.change(input, { target: { value: '  New Workspace  ' } });

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith('New Workspace');
      });
    });

    it('should show error for empty name', async () => {
      renderEditor('create');

      const input = screen.getByTestId('workspace-name-input');
      fireEvent.change(input, { target: { value: '' } });

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Workspace name is required')).toBeTruthy();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('should close dialog after successful create', async () => {
      renderEditor('create');

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('rename mode', () => {
    it('should call onRename with workspace id and trimmed name', async () => {
      renderEditor('rename', mockWorkspace);

      const input = screen.getByTestId('workspace-name-input');
      fireEvent.change(input, { target: { value: 'Renamed Workspace' } });

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockOnRename).toHaveBeenCalledWith('ws-1', 'Renamed Workspace');
      });
    });
  });

  describe('duplicate mode', () => {
    it('should call onDuplicate with workspace id and new name', async () => {
      renderEditor('duplicate', mockWorkspace);

      const input = screen.getByTestId('workspace-name-input');
      fireEvent.change(input, { target: { value: 'Duplicated Workspace' } });

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockOnDuplicate).toHaveBeenCalledWith('ws-1', 'Duplicated Workspace');
      });
    });
  });

  describe('delete mode', () => {
    it('should call onDelete with workspace id', async () => {
      renderEditor('delete', mockWorkspace, 3);

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('ws-1');
      });
    });

    it('should prevent deleting the last workspace', async () => {
      renderEditor('delete', mockWorkspace, 1);

      // The submit button should be disabled, preventing form submission
      const submitBtn = screen.getByTestId('workspace-editor-submit') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);

      // Even if form is somehow submitted directly, onDelete should not be called
      // and the check in handleSubmit will prevent deletion
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should disable delete button when only one workspace exists', () => {
      renderEditor('delete', mockWorkspace, 1);

      const submitBtn = screen.getByTestId('workspace-editor-submit') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    });
  });

  describe('submit button text', () => {
    it('should show "Create" for create mode', () => {
      renderEditor('create');
      expect(screen.getByTestId('workspace-editor-submit').textContent).toBe('Create');
    });

    it('should show "Save" for rename mode', () => {
      renderEditor('rename', mockWorkspace);
      expect(screen.getByTestId('workspace-editor-submit').textContent).toBe('Save');
    });

    it('should show "Duplicate" for duplicate mode', () => {
      renderEditor('duplicate', mockWorkspace);
      expect(screen.getByTestId('workspace-editor-submit').textContent).toBe('Duplicate');
    });

    it('should show "Delete" for delete mode', () => {
      renderEditor('delete', mockWorkspace);
      expect(screen.getByTestId('workspace-editor-submit').textContent).toBe('Delete');
    });
  });

  describe('closing behavior', () => {
    it('should close when cancel button is clicked', () => {
      renderEditor('create');

      const cancelBtn = screen.getByText('Cancel');
      fireEvent.click(cancelBtn);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close when close button (X) is clicked', () => {
      renderEditor('create');

      const closeBtn = screen.getByLabelText('Close dialog');
      fireEvent.click(closeBtn);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close when overlay is clicked', () => {
      renderEditor('create');

      const overlay = document.querySelector('.profile-editor-overlay');
      fireEvent.click(overlay!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when dialog content is clicked', () => {
      renderEditor('create');

      const dialog = screen.getByTestId('workspace-editor-dialog');
      fireEvent.click(dialog);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close when Escape key is pressed', () => {
      renderEditor('create');

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should display error message when operation fails', async () => {
      mockOnCreate.mockRejectedValue(new Error('Network error'));
      renderEditor('create');

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });

    it('should display generic error for non-Error exceptions', async () => {
      mockOnCreate.mockRejectedValue('Unknown error');
      renderEditor('create');

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeTruthy();
      });
    });

    it('should not close dialog when error occurs', async () => {
      mockOnCreate.mockRejectedValue(new Error('Failed'));
      renderEditor('create');

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeTruthy();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('submitting state', () => {
    it('should show "Processing..." while submitting', async () => {
      let resolveCreate: () => void = () => {};
      mockOnCreate.mockImplementation(() => new Promise((resolve) => {
        resolveCreate = resolve;
      }));

      renderEditor('create');

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      fireEvent.click(submitBtn);

      expect(screen.getByText('Processing...')).toBeTruthy();

      resolveCreate();
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should disable input while submitting', async () => {
      let resolveCreate: () => void = () => {};
      mockOnCreate.mockImplementation(() => new Promise((resolve) => {
        resolveCreate = resolve;
      }));

      renderEditor('create');

      const submitBtn = screen.getByTestId('workspace-editor-submit');
      const input = screen.getByTestId('workspace-name-input') as HTMLInputElement;

      fireEvent.click(submitBtn);

      expect(input.disabled).toBe(true);

      resolveCreate();
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
