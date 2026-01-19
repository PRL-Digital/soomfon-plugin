/**
 * Action Label Utilities
 * Helper functions for generating action type labels/badges
 */

import type { Action, ActionType } from '../types/actions';

/** Map of action types to display abbreviations */
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  keyboard: 'kbd',
  launch: 'app',
  script: 'scr',
  http: 'http',
  media: 'med',
  system: 'sys',
  profile: 'prof',
  workspace: 'ws',
  text: 'txt',
  home_assistant: 'ha',
  node_red: 'nr',
};

/**
 * Get the display label for an action type
 * @param actionType - The action type
 * @returns The abbreviated label for the action type
 */
export const getActionTypeLabel = (actionType: ActionType): string => {
  return ACTION_TYPE_LABELS[actionType] || actionType;
};

/**
 * Get the display label for an action
 * Returns '-' if no action is configured
 * @param action - The action object (may be undefined/null)
 * @returns The abbreviated label or '-' for no action
 */
export const getActionLabel = (action: Action | Partial<Action> | undefined | null): string => {
  if (!action || !action.type) {
    return '-';
  }
  return getActionTypeLabel(action.type);
};

/** Layer type for toggle */
export type LayerType = 'primary' | 'shift';
