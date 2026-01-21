import React, { useCallback, useEffect, useState } from 'react';
import type { WorkspaceAction, WorkspaceDirection } from '@shared/types/actions';

interface WorkspaceInfo {
  index: number;
  name: string;
}

/** Error state for workspace loading failures */
interface WorkspaceLoadError {
  message: string;
}

/** Direction option for the selector */
interface DirectionOption {
  value: WorkspaceDirection;
  label: string;
  description: string;
}

/** Available direction options */
const DIRECTION_OPTIONS: DirectionOption[] = [
  { value: 'next', label: 'Next', description: 'Navigate to the next workspace (wraps around)' },
  { value: 'previous', label: 'Previous', description: 'Navigate to the previous workspace (wraps around)' },
  { value: 'specific', label: 'Specific', description: 'Navigate to a specific workspace by index' },
];

export interface WorkspaceActionFormProps {
  /** Current configuration */
  config: Partial<WorkspaceAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<WorkspaceAction>) => void;
}

export const WorkspaceActionForm: React.FC<WorkspaceActionFormProps> = ({
  config,
  onChange,
}) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<WorkspaceLoadError | null>(null);

  // Load available workspaces from the current profile
  useEffect(() => {
    const loadWorkspaces = async () => {
      setLoadError(null);
      try {
        // Access the Tauri API through window for profile/workspace info
        const api = (window as unknown as { tauriAPI?: {
          profiles?: {
            getActive: () => Promise<{ workspaces?: Array<{ id: string; name: string }> } | null>
          }
        } }).tauriAPI;

        if (api?.profiles?.getActive) {
          const activeProfile = await api.profiles.getActive();
          if (activeProfile?.workspaces) {
            const workspaceList = activeProfile.workspaces.map((ws, index) => ({
              index,
              name: ws.name || `Workspace ${index + 1}`,
            }));
            setWorkspaces(workspaceList);
          } else {
            // No workspaces found - use default single workspace
            setWorkspaces([{ index: 0, name: 'Default Workspace' }]);
          }
        } else {
          setLoadError({ message: 'Profile API not available' });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load workspaces';
        setLoadError({ message: errorMessage });
        console.error('Failed to load workspaces:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  // Handle direction change
  const handleDirectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const direction = e.target.value as WorkspaceDirection;
      const newConfig: Partial<WorkspaceAction> = { ...config, direction };
      // Clear workspaceIndex when not using specific direction
      if (direction !== 'specific') {
        delete newConfig.workspaceIndex;
      }
      onChange(newConfig);
    },
    [config, onChange]
  );

  // Handle workspace index change (for specific direction)
  const handleWorkspaceIndexChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const workspaceIndex = parseInt(e.target.value, 10);
      onChange({ ...config, workspaceIndex });
    },
    [config, onChange]
  );

  const selectedDirection = config.direction || 'next';
  const showWorkspaceSelect = selectedDirection === 'specific';

  return (
    <div className="action-form action-form--workspace" data-testid="workspace-action-form">
      {/* Direction Selection */}
      <div className="action-form__row">
        <label className="action-form__label">Navigation Direction</label>
        <select
          className="action-form__select"
          value={selectedDirection}
          onChange={handleDirectionChange}
          data-testid="workspace-direction-select"
        >
          {DIRECTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="action-form__hint">
          {DIRECTION_OPTIONS.find((o) => o.value === selectedDirection)?.description}
        </span>
      </div>

      {/* Workspace Selection (only for specific direction) */}
      {showWorkspaceSelect && (
        <div className="action-form__row">
          <label className="action-form__label">Target Workspace</label>
          {loading ? (
            <span className="action-form__loading">Loading workspaces...</span>
          ) : loadError ? (
            <span className="action-form__error" data-testid="workspace-load-error">
              {loadError.message}
            </span>
          ) : (
            <select
              className="action-form__select"
              value={config.workspaceIndex ?? ''}
              onChange={handleWorkspaceIndexChange}
              data-testid="workspace-index-select"
            >
              <option value="">Select a workspace...</option>
              {workspaces.map((workspace) => (
                <option key={workspace.index} value={workspace.index}>
                  {workspace.name}
                </option>
              ))}
            </select>
          )}
          <span className="action-form__hint">
            Workspace to switch to when this action is triggered
          </span>
        </div>
      )}
    </div>
  );
};

export default WorkspaceActionForm;
