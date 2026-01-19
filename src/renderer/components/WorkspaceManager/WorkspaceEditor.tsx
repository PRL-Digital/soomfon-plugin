/**
 * WorkspaceEditor Component
 * Modal dialogs for creating, renaming, duplicating, and deleting workspaces
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Workspace } from '@shared/types/config';

// ============================================================================
// Dialog Types
// ============================================================================

export type WorkspaceDialogMode = 'create' | 'rename' | 'duplicate' | 'delete' | null;

export interface WorkspaceEditorProps {
  mode: WorkspaceDialogMode;
  workspace?: Workspace | null;
  workspaceCount: number;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (workspaceId: string, name: string) => Promise<void>;
  onDuplicate: (workspaceId: string, newName: string) => Promise<void>;
  onDelete: (workspaceId: string) => Promise<void>;
}

// ============================================================================
// WorkspaceEditor Component
// ============================================================================

const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({
  mode,
  workspace,
  workspaceCount,
  onClose,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when mode changes
  useEffect(() => {
    if (mode === 'create') {
      setName(`Workspace ${workspaceCount + 1}`);
    } else if (mode === 'rename' && workspace) {
      setName(workspace.name);
    } else if (mode === 'duplicate' && workspace) {
      setName(`${workspace.name} (Copy)`);
    }
    setError(null);
  }, [mode, workspace, workspaceCount]);

  // Focus input on open
  useEffect(() => {
    if (mode && mode !== 'delete' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (mode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mode, onClose]);

  if (!mode) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode !== 'delete' && !name.trim()) {
      setError('Workspace name is required');
      return;
    }

    // Prevent deleting the last workspace
    if (mode === 'delete' && workspaceCount <= 1) {
      setError('Cannot delete the last workspace');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      switch (mode) {
        case 'create':
          await onCreate(name.trim());
          break;
        case 'rename':
          if (workspace) {
            await onRename(workspace.id, name.trim());
          }
          break;
        case 'duplicate':
          if (workspace) {
            await onDuplicate(workspace.id, name.trim());
          }
          break;
        case 'delete':
          if (workspace) {
            await onDelete(workspace.id);
          }
          break;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create Workspace';
      case 'rename':
        return 'Rename Workspace';
      case 'duplicate':
        return 'Duplicate Workspace';
      case 'delete':
        return 'Delete Workspace';
      default:
        return '';
    }
  };

  const getSubmitText = () => {
    if (isSubmitting) return 'Processing...';
    switch (mode) {
      case 'create':
        return 'Create';
      case 'rename':
        return 'Save';
      case 'duplicate':
        return 'Duplicate';
      case 'delete':
        return 'Delete';
      default:
        return 'OK';
    }
  };

  return (
    <div className="profile-editor-overlay" onClick={onClose}>
      <div
        className="profile-editor"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="workspace-editor-title"
        data-testid="workspace-editor-dialog"
      >
        <div className="profile-editor__header">
          <h2 id="workspace-editor-title" className="profile-editor__title">
            {getTitle()}
          </h2>
          <button
            className="profile-editor__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-editor__content">
            {mode === 'delete' ? (
              <div className="profile-editor__delete-warning">
                <div className="profile-editor__warning-icon">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <p className="profile-editor__warning-text">
                  Are you sure you want to delete <strong>{workspace?.name}</strong>?
                </p>
                <p className="profile-editor__warning-subtext">
                  This action cannot be undone. All button and encoder configurations
                  in this workspace will be permanently removed.
                </p>
              </div>
            ) : (
              <div className="profile-editor__field">
                <label
                  htmlFor="workspace-name"
                  className="profile-editor__label"
                >
                  Name
                </label>
                <input
                  ref={inputRef}
                  id="workspace-name"
                  type="text"
                  className="profile-editor__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter workspace name"
                  disabled={isSubmitting}
                  maxLength={30}
                  data-testid="workspace-name-input"
                />
              </div>
            )}

            {error && (
              <div className="profile-editor__error">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="profile-editor__footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${mode === 'delete' ? 'btn-danger' : 'btn-primary'}`}
              disabled={isSubmitting || (mode === 'delete' && workspaceCount <= 1)}
              data-testid="workspace-editor-submit"
            >
              {getSubmitText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceEditor;
