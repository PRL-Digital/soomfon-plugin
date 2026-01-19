import React from 'react';
import type { Workspace } from '@shared/types/config';

export interface WorkspaceTabsProps {
  /** List of workspaces */
  workspaces: Workspace[];
  /** Index of the currently active workspace */
  activeIndex: number;
  /** Callback when a workspace tab is selected */
  onSelect: (index: number) => void;
  /** Callback when the add button is clicked */
  onCreate: () => void;
}

/**
 * WorkspaceTabs component - horizontal tab bar for quick workspace navigation
 */
export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({
  workspaces,
  activeIndex,
  onSelect,
  onCreate,
}) => {
  return (
    <div className="workspace-tabs" data-testid="workspace-tabs">
      {workspaces.map((workspace, index) => (
        <button
          key={workspace.id}
          type="button"
          className={`workspace-tabs__tab ${index === activeIndex ? 'workspace-tabs__tab--active' : ''}`}
          onClick={() => onSelect(index)}
          data-testid={`workspace-tab-${index}`}
          title={workspace.name}
        >
          {workspace.name}
        </button>
      ))}
      <button
        type="button"
        className="workspace-tabs__add-btn"
        onClick={onCreate}
        data-testid="workspace-tabs-add"
        title="Add workspace"
      >
        +
      </button>
    </div>
  );
};

export default WorkspaceTabs;
