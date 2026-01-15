/**
 * Action Types
 * Type definitions for all action types supported by the action system
 */

/** All supported action type identifiers */
export type ActionType =
  | 'keyboard'
  | 'launch'
  | 'script'
  | 'http'
  | 'media'
  | 'system'
  | 'profile'
  | 'text';

/** Base action interface - all actions extend this */
export interface BaseAction {
  /** Unique identifier for this action */
  id: string;
  /** Action type discriminator */
  type: ActionType;
  /** Human-readable name for the action */
  name: string;
  /** Icon identifier (emoji or icon name) */
  icon?: string;
  /** Whether the action is enabled */
  enabled: boolean;
}

/** Keyboard action - sends keyboard input */
export interface KeyboardAction extends BaseAction {
  type: 'keyboard';
  /** Key or key combination to send (e.g., 'a', 'ctrl+c', 'alt+f4') */
  keys: string;
  /** Modifiers to hold during key press */
  modifiers?: Array<'ctrl' | 'alt' | 'shift' | 'win'>;
  /** Duration to hold the key in milliseconds */
  holdDuration?: number;
}

/** Launch action - starts an application or opens a file */
export interface LaunchAction extends BaseAction {
  type: 'launch';
  /** Path to the executable or file to open */
  path: string;
  /** Command-line arguments */
  args?: string[];
  /** Working directory for the process */
  workingDirectory?: string;
  /** Whether to use shell execution (for opening files with default app) */
  useShell?: boolean;
}

/** Script type for script actions */
export type ScriptType = 'powershell' | 'cmd' | 'bash';

/** Script action - runs a script */
export interface ScriptAction extends BaseAction {
  type: 'script';
  /** Type of script to execute */
  scriptType: ScriptType;
  /** Inline script content (mutually exclusive with scriptPath) */
  script?: string;
  /** Path to script file (mutually exclusive with script) */
  scriptPath?: string;
  /** Execution timeout in milliseconds */
  timeout?: number;
}

/** HTTP method types */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** HTTP body type */
export type HttpBodyType = 'json' | 'form';

/** HTTP action - makes HTTP requests */
export interface HttpAction extends BaseAction {
  type: 'http';
  /** HTTP method */
  method: HttpMethod;
  /** Request URL */
  url: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Body type */
  bodyType?: HttpBodyType;
  /** Request body (string for form, object for json) */
  body?: string | Record<string, unknown>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/** Media action types */
export type MediaActionType =
  | 'play_pause'
  | 'next'
  | 'previous'
  | 'stop'
  | 'volume_up'
  | 'volume_down'
  | 'mute';

/** Media action - controls media playback */
export interface MediaAction extends BaseAction {
  type: 'media';
  /** Media action to perform */
  action: MediaActionType;
  /** Volume change amount (for volume_up/volume_down) */
  volumeAmount?: number;
}

/** System action types */
export type SystemActionType =
  | 'switch_desktop_left'
  | 'switch_desktop_right'
  | 'show_desktop'
  | 'lock_screen'
  | 'screenshot'
  | 'start_menu'
  | 'task_view';

/** System action - performs system-level operations */
export interface SystemAction extends BaseAction {
  type: 'system';
  /** System action to perform */
  action: SystemActionType;
}

/** Profile action - switches between configuration profiles */
export interface ProfileAction extends BaseAction {
  type: 'profile';
  /** Profile ID to switch to */
  profileId: string;
}

/** Text action - types text strings */
export interface TextAction extends BaseAction {
  type: 'text';
  /** Text to type */
  text: string;
  /** Delay between characters in milliseconds */
  typeDelay?: number;
}

/** Union type of all action types */
export type Action =
  | KeyboardAction
  | LaunchAction
  | ScriptAction
  | HttpAction
  | MediaAction
  | SystemAction
  | ProfileAction
  | TextAction;

/** Execution result status */
export type ExecutionStatus = 'success' | 'failure' | 'cancelled';

/** Action execution result */
export interface ActionExecutionResult {
  /** Execution status */
  status: ExecutionStatus;
  /** Action that was executed */
  actionId: string;
  /** When the action started */
  startTime: number;
  /** When the action completed */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Additional result data (e.g., HTTP response, script output) */
  data?: unknown;
}

/** Action handler interface - implemented by each action type handler */
export interface ActionHandler<T extends Action = Action> {
  /** The action type this handler supports */
  readonly actionType: ActionType;
  /** Execute the action */
  execute(action: T): Promise<ActionExecutionResult>;
  /** Cancel a running action (if supported) */
  cancel?(): Promise<void>;
}

/** Trigger types for button events */
export type ButtonTrigger = 'press' | 'release' | 'longPress';

/** Trigger types for encoder events */
export type EncoderTrigger = 'rotateCW' | 'rotateCCW' | 'press' | 'release';

/** Element type for bindings */
export type ElementType = 'lcdButton' | 'normalButton' | 'encoder';

/** Event-to-action binding configuration */
export interface ActionBinding {
  /** Unique identifier for this binding */
  id: string;
  /** Type of element (button or encoder) */
  elementType: ElementType;
  /** Index of the element */
  elementIndex: number;
  /** Trigger event type */
  trigger: ButtonTrigger | EncoderTrigger;
  /** Action to execute */
  action: Action;
}
