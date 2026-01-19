/**
 * WorkspaceList Component
 * Displays a list of workspaces with management options
 */

import React from 'react';
import type { Workspace } from '@shared/types/config';

export interface WorkspaceListProps {
  workspaces: Workspace[];
  activeWorkspaceIndex: number;
  onWorkspaceSelect: (index: number) => void;
  onWorkspaceCreate: () => void;
  onWorkspaceRename: (workspace: Workspace) => void;
  onWorkspaceDuplicate: (workspace: Workspace) => void;
  onWorkspaceDelete: (workspace: Workspace) => void;
  isLoading?: boolean;
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  activeWorkspaceIndex,
  onWorkspaceSelect,
  onWorkspaceCreate,
  onWorkspaceRename,
  onWorkspaceDuplicate,
  onWorkspaceDelete,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="workspace-list workspace-list--loading" data-testid="workspace-list-loading">
        <div className="workspace-list__spinner">Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div className="workspace-list" data-testid="workspace-list">
      <div className="workspace-list__header">
        <h3 className="workspace-list__title">Workspaces</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={onWorkspaceCreate}
          title="Create new workspace"
          data-testid="workspace-create-btn"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New
        </button>
      </div>

      <div className="workspace-list__items">
        {workspaces.map((workspace, index) => {
          const isActive = index === activeWorkspaceIndex;
          const buttonCount = workspace.buttons.length;
          const encoderCount = workspace.encoders.length;

          return (
            <div
              key={workspace.id}
              className={`workspace-list__item ${isActive ? 'workspace-list__item--active' : ''}`}
              onClick={() => onWorkspaceSelect(index)}
              data-testid={`workspace-item-${index}`}
            >
              <div className="workspace-list__item-content">
                <div className="workspace-list__item-header">
                  <span className="workspace-list__item-name">{workspace.name}</span>
                  {isActive && (
                    <span className="workspace-list__item-badge" data-testid="workspace-active-badge">
                      Active
                    </span>
                  )}
                </div>
                <div className="workspace-list__item-meta">
                  <span className="workspace-list__item-stat">
                    {buttonCount} button{buttonCount !== 1 ? 's' : ''}
                  </span>
                  <span className="workspace-list__item-stat">
                    {encoderCount} encoder{encoderCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="workspace-list__item-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="workspace-list__action-btn"
                  onClick={() => onWorkspaceRename(workspace)}
                  title="Rename workspace"
                  data-testid={`workspace-rename-btn-${index}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
                <button
                  className="workspace-list__action-btn"
                  onClick={() => onWorkspaceDuplicate(workspace)}
                  title="Duplicate workspace"
                  data-testid={`workspace-duplicate-btn-${index}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  className="workspace-list__action-btn workspace-list__action-btn--danger"
                  onClick={() => onWorkspaceDelete(workspace)}
                  title="Delete workspace"
                  disabled={workspaces.length <= 1}
                  data-testid={`workspace-delete-btn-${index}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {workspaces.length === 0 && (
        <div className="workspace-list__empty">
          <p>No workspaces found.</p>
          <button
            className="btn btn-primary"
            onClick={onWorkspaceCreate}
          >
            Create your first workspace
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkspaceList;
