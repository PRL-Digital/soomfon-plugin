/**
 * Action Validation Schemas
 * Zod schemas for validating action configurations
 */

import { z } from 'zod';

/** Action type enum schema */
export const actionTypeSchema = z.enum([
  'keyboard',
  'launch',
  'script',
  'http',
  'media',
  'system',
  'profile',
  'text',
]);

/** Base action schema - fields common to all actions */
const baseActionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  enabled: z.boolean().default(true),
});

/** Keyboard modifier schema */
const keyboardModifierSchema = z.enum(['ctrl', 'alt', 'shift', 'win']);

/** Keyboard action schema */
export const keyboardActionSchema = baseActionSchema.extend({
  type: z.literal('keyboard'),
  keys: z.string().min(1),
  modifiers: z.array(keyboardModifierSchema).optional(),
  holdDuration: z.number().positive().optional(),
});

/** Launch action schema */
export const launchActionSchema = baseActionSchema.extend({
  type: z.literal('launch'),
  path: z.string().min(1),
  args: z.array(z.string()).optional(),
  workingDirectory: z.string().optional(),
  useShell: z.boolean().optional(),
});

/** Script type schema */
export const scriptTypeSchema = z.enum(['powershell', 'cmd', 'bash']);

/** Script action base schema (without refinement for discriminated union compatibility) */
export const scriptActionSchema = baseActionSchema.extend({
  type: z.literal('script'),
  scriptType: scriptTypeSchema,
  /** Inline script content (mutually exclusive with scriptPath) */
  script: z.string().optional(),
  /** Path to script file (mutually exclusive with script) */
  scriptPath: z.string().optional(),
  timeout: z.number().positive().optional(),
});

/** Script action schema with validation that either script or scriptPath is provided */
export const scriptActionWithValidationSchema = scriptActionSchema.refine(
  (data) => data.script !== undefined || data.scriptPath !== undefined,
  { message: 'Either script or scriptPath must be provided' }
);

/** HTTP method schema */
export const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

/** HTTP body type schema */
export const httpBodyTypeSchema = z.enum(['json', 'form']);

/** HTTP action schema */
export const httpActionSchema = baseActionSchema.extend({
  type: z.literal('http'),
  method: httpMethodSchema,
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  bodyType: httpBodyTypeSchema.optional(),
  body: z.union([z.string(), z.record(z.unknown())]).optional(),
  timeout: z.number().positive().optional(),
});

/** Media action type schema */
export const mediaActionTypeSchema = z.enum([
  'play_pause',
  'next',
  'previous',
  'stop',
  'volume_up',
  'volume_down',
  'mute',
]);

/** Media action schema */
export const mediaActionSchema = baseActionSchema.extend({
  type: z.literal('media'),
  action: mediaActionTypeSchema,
  volumeAmount: z.number().positive().max(100).optional(),
});

/** System action type schema */
export const systemActionTypeSchema = z.enum([
  'switch_desktop_left',
  'switch_desktop_right',
  'show_desktop',
  'lock_screen',
  'screenshot',
  'start_menu',
  'task_view',
]);

/** System action schema */
export const systemActionSchema = baseActionSchema.extend({
  type: z.literal('system'),
  action: systemActionTypeSchema,
});

/** Profile action schema */
export const profileActionSchema = baseActionSchema.extend({
  type: z.literal('profile'),
  profileId: z.string().min(1),
});

/** Text action schema */
export const textActionSchema = baseActionSchema.extend({
  type: z.literal('text'),
  text: z.string().min(1),
  typeDelay: z.number().nonnegative().optional(),
});

/** Union schema for all action types - uses discriminated union */
export const actionSchema = z.discriminatedUnion('type', [
  keyboardActionSchema,
  launchActionSchema,
  scriptActionSchema,
  httpActionSchema,
  mediaActionSchema,
  systemActionSchema,
  profileActionSchema,
  textActionSchema,
]);

/** Execution status schema */
export const executionStatusSchema = z.enum(['success', 'failure', 'cancelled']);

/** Action execution result schema */
export const actionExecutionResultSchema = z.object({
  status: executionStatusSchema,
  actionId: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number(),
  error: z.string().optional(),
  data: z.unknown().optional(),
});

/** Button trigger schema */
export const buttonTriggerSchema = z.enum(['press', 'release', 'longPress']);

/** Encoder trigger schema */
export const encoderTriggerSchema = z.enum(['rotateCW', 'rotateCCW', 'press', 'release']);

/** Element type schema */
export const elementTypeSchema = z.enum(['lcdButton', 'normalButton', 'encoder']);

/** Action binding schema */
export const actionBindingSchema = z.object({
  id: z.string().min(1),
  elementType: elementTypeSchema,
  elementIndex: z.number().int().nonnegative(),
  trigger: z.union([buttonTriggerSchema, encoderTriggerSchema]),
  action: actionSchema,
});

/** Array of action bindings schema */
export const actionBindingsSchema = z.array(actionBindingSchema);

/** Type inference helpers */
export type KeyboardActionInput = z.input<typeof keyboardActionSchema>;
export type LaunchActionInput = z.input<typeof launchActionSchema>;
export type ScriptActionInput = z.input<typeof scriptActionSchema>;
export type HttpActionInput = z.input<typeof httpActionSchema>;
export type MediaActionInput = z.input<typeof mediaActionSchema>;
export type SystemActionInput = z.input<typeof systemActionSchema>;
export type ProfileActionInput = z.input<typeof profileActionSchema>;
export type TextActionInput = z.input<typeof textActionSchema>;
export type ActionInput = z.input<typeof actionSchema>;
export type ActionBindingInput = z.input<typeof actionBindingSchema>;

/** Validated types */
export type ValidatedKeyboardAction = z.output<typeof keyboardActionSchema>;
export type ValidatedLaunchAction = z.output<typeof launchActionSchema>;
export type ValidatedScriptAction = z.output<typeof scriptActionSchema>;
export type ValidatedHttpAction = z.output<typeof httpActionSchema>;
export type ValidatedMediaAction = z.output<typeof mediaActionSchema>;
export type ValidatedSystemAction = z.output<typeof systemActionSchema>;
export type ValidatedProfileAction = z.output<typeof profileActionSchema>;
export type ValidatedTextAction = z.output<typeof textActionSchema>;
export type ValidatedAction = z.output<typeof actionSchema>;
export type ValidatedActionBinding = z.output<typeof actionBindingSchema>;

/** Validation helper functions */
export function validateAction(data: unknown): ValidatedAction {
  return actionSchema.parse(data);
}

export function validateActionBinding(data: unknown): ValidatedActionBinding {
  return actionBindingSchema.parse(data);
}

export function validateActionBindings(data: unknown): ValidatedActionBinding[] {
  return actionBindingsSchema.parse(data);
}

export function safeValidateAction(data: unknown): { success: true; data: ValidatedAction } | { success: false; error: z.ZodError } {
  const result = actionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
