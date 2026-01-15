/**
 * Action Schema Tests
 *
 * Tests for Zod validation schemas that ensure action configurations are valid:
 * - Required fields validation
 * - Type-specific field requirements
 * - Discriminated union type checking
 *
 * Why these tests matter:
 * Invalid action configurations could cause runtime errors when executing actions.
 * Schema validation catches bad configs before they cause problems.
 */

import { describe, it, expect } from 'vitest';
import {
  actionSchema,
  keyboardActionSchema,
  launchActionSchema,
  scriptActionSchema,
  scriptActionWithValidationSchema,
  httpActionSchema,
  mediaActionSchema,
  systemActionSchema,
  homeAssistantActionSchema,
  validateAction,
  safeValidateAction,
} from './schemas';

describe('Action Schemas', () => {
  describe('keyboardActionSchema', () => {
    it('should validate a valid keyboard action', () => {
      const action = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Press A',
        keys: 'a',
        enabled: true,
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should accept optional modifiers', () => {
      const action = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Ctrl+C',
        keys: 'c',
        modifiers: ['ctrl'],
        enabled: true,
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should reject invalid modifiers', () => {
      const action = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Invalid',
        keys: 'a',
        modifiers: ['invalid'],
        enabled: true,
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('should require keys field', () => {
      const action = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Missing keys',
        enabled: true,
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('should reject empty keys', () => {
      const action = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Empty keys',
        keys: '',
        enabled: true,
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('launchActionSchema', () => {
    it('should validate a valid launch action', () => {
      const action = {
        id: 'test-1',
        type: 'launch',
        name: 'Open Notepad',
        path: 'C:\\Windows\\notepad.exe',
        enabled: true,
      };

      const result = launchActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should accept optional args and workingDirectory', () => {
      const action = {
        id: 'test-1',
        type: 'launch',
        name: 'Open with args',
        path: '/usr/bin/code',
        args: ['--new-window', '/path/to/file'],
        workingDirectory: '/home/user',
        useShell: true,
        enabled: true,
      };

      const result = launchActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should require path field', () => {
      const action = {
        id: 'test-1',
        type: 'launch',
        name: 'Missing path',
        enabled: true,
      };

      const result = launchActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('scriptActionSchema', () => {
    it('should validate script with inline content', () => {
      const action = {
        id: 'test-1',
        type: 'script',
        name: 'Run Script',
        scriptType: 'powershell',
        script: 'Get-Process',
        enabled: true,
      };

      const result = scriptActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate script with file path', () => {
      const action = {
        id: 'test-1',
        type: 'script',
        name: 'Run Script File',
        scriptType: 'bash',
        scriptPath: '/scripts/deploy.sh',
        enabled: true,
      };

      const result = scriptActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should accept all script types', () => {
      const scriptTypes = ['powershell', 'cmd', 'bash'];

      for (const scriptType of scriptTypes) {
        const action = {
          id: 'test-1',
          type: 'script',
          name: 'Test',
          scriptType,
          script: 'echo hello',
          enabled: true,
        };

        const result = scriptActionSchema.safeParse(action);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid script type', () => {
      const action = {
        id: 'test-1',
        type: 'script',
        name: 'Invalid',
        scriptType: 'python',
        script: 'print("hi")',
        enabled: true,
      };

      const result = scriptActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('scriptActionWithValidationSchema', () => {
    it('should require either script or scriptPath', () => {
      const action = {
        id: 'test-1',
        type: 'script',
        name: 'Missing both',
        scriptType: 'bash',
        enabled: true,
      };

      const result = scriptActionWithValidationSchema.safeParse(action);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Either script or scriptPath must be provided'
        );
      }
    });
  });

  describe('httpActionSchema', () => {
    it('should validate a valid HTTP GET action', () => {
      const action = {
        id: 'test-1',
        type: 'http',
        name: 'API Call',
        method: 'GET',
        url: 'https://api.example.com/data',
        enabled: true,
      };

      const result = httpActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate HTTP POST with body', () => {
      const action = {
        id: 'test-1',
        type: 'http',
        name: 'POST Data',
        method: 'POST',
        url: 'https://api.example.com/submit',
        headers: { 'Content-Type': 'application/json' },
        bodyType: 'json',
        body: { key: 'value' },
        timeout: 5000,
        enabled: true,
      };

      const result = httpActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should accept all HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const action = {
          id: 'test-1',
          type: 'http',
          name: 'Test',
          method,
          url: 'https://example.com',
          enabled: true,
        };

        const result = httpActionSchema.safeParse(action);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid URL', () => {
      const action = {
        id: 'test-1',
        type: 'http',
        name: 'Invalid URL',
        method: 'GET',
        url: 'not-a-url',
        enabled: true,
      };

      const result = httpActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('should reject invalid HTTP method', () => {
      const action = {
        id: 'test-1',
        type: 'http',
        name: 'Invalid Method',
        method: 'INVALID',
        url: 'https://example.com',
        enabled: true,
      };

      const result = httpActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('mediaActionSchema', () => {
    it('should validate all media action types', () => {
      const mediaActions = [
        'play_pause',
        'next',
        'previous',
        'stop',
        'volume_up',
        'volume_down',
        'mute',
      ];

      for (const mediaAction of mediaActions) {
        const action = {
          id: 'test-1',
          type: 'media',
          name: 'Media Control',
          action: mediaAction,
          enabled: true,
        };

        const result = mediaActionSchema.safeParse(action);
        expect(result.success).toBe(true);
      }
    });

    it('should accept volumeAmount for volume actions', () => {
      const action = {
        id: 'test-1',
        type: 'media',
        name: 'Volume Up',
        action: 'volume_up',
        volumeAmount: 10,
        enabled: true,
      };

      const result = mediaActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should reject volumeAmount over 100', () => {
      const action = {
        id: 'test-1',
        type: 'media',
        name: 'Invalid Volume',
        action: 'volume_up',
        volumeAmount: 150,
        enabled: true,
      };

      const result = mediaActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('systemActionSchema', () => {
    it('should validate all system action types', () => {
      const systemActions = [
        'switch_desktop_left',
        'switch_desktop_right',
        'show_desktop',
        'lock_screen',
        'screenshot',
        'start_menu',
        'task_view',
      ];

      for (const systemAction of systemActions) {
        const action = {
          id: 'test-1',
          type: 'system',
          name: 'System Control',
          action: systemAction,
          enabled: true,
        };

        const result = systemActionSchema.safeParse(action);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('actionSchema (discriminated union)', () => {
    it('should discriminate based on type field', () => {
      const keyboardAction = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Keyboard',
        keys: 'a',
        enabled: true,
      };

      const launchAction = {
        id: 'test-2',
        type: 'launch',
        name: 'Launch',
        path: '/app',
        enabled: true,
      };

      expect(actionSchema.safeParse(keyboardAction).success).toBe(true);
      expect(actionSchema.safeParse(launchAction).success).toBe(true);
    });

    it('should reject unknown action type', () => {
      const action = {
        id: 'test-1',
        type: 'unknown_type',
        name: 'Unknown',
        enabled: true,
      };

      const result = actionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('Base Action Fields', () => {
    it('should require id field', () => {
      const action = {
        type: 'keyboard',
        name: 'Missing ID',
        keys: 'a',
        enabled: true,
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('should require name field', () => {
      const action = {
        id: 'test-1',
        type: 'keyboard',
        keys: 'a',
        enabled: true,
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('should default enabled to true', () => {
      const action = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Test',
        keys: 'a',
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
      }
    });

    it('should accept optional icon field', () => {
      const action = {
        id: 'test-1',
        type: 'keyboard',
        name: 'With Icon',
        keys: 'a',
        icon: 'keyboard',
        enabled: true,
      };

      const result = keyboardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation Helper Functions', () => {
    it('validateAction should throw on invalid data', () => {
      const invalid = { type: 'unknown' };
      expect(() => validateAction(invalid)).toThrow();
    });

    it('validateAction should return validated data', () => {
      const valid = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Test',
        keys: 'a',
        enabled: true,
      };

      const result = validateAction(valid);
      expect(result.id).toBe('test-1');
      expect(result.type).toBe('keyboard');
    });

    it('safeValidateAction should return success result for valid data', () => {
      const valid = {
        id: 'test-1',
        type: 'keyboard',
        name: 'Test',
        keys: 'a',
        enabled: true,
      };

      const result = safeValidateAction(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('test-1');
      }
    });

    it('safeValidateAction should return error result for invalid data', () => {
      const invalid = { type: 'unknown' };

      const result = safeValidateAction(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('homeAssistantActionSchema', () => {
    it('should validate a valid home assistant action with toggle operation', () => {
      const action = {
        id: 'test-1',
        type: 'home_assistant',
        name: 'Toggle Light',
        operation: 'toggle',
        entityId: 'light.living_room',
        enabled: true,
      };

      const result = homeAssistantActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate all home assistant operation types', () => {
      const operations = [
        'toggle',
        'turn_on',
        'turn_off',
        'set_brightness',
        'run_script',
        'trigger_automation',
        'custom',
      ];

      for (const operation of operations) {
        const action = {
          id: 'test-1',
          type: 'home_assistant',
          name: 'HA Action',
          operation,
          entityId: 'light.test',
          enabled: true,
        };

        const result = homeAssistantActionSchema.safeParse(action);
        expect(result.success).toBe(true);
      }
    });

    it('should accept optional brightness for set_brightness operation', () => {
      const action = {
        id: 'test-1',
        type: 'home_assistant',
        name: 'Set Brightness',
        operation: 'set_brightness',
        entityId: 'light.bedroom',
        brightness: 128,
        enabled: true,
      };

      const result = homeAssistantActionSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.brightness).toBe(128);
      }
    });

    it('should reject brightness outside valid range (0-255)', () => {
      const actionOver = {
        id: 'test-1',
        type: 'home_assistant',
        name: 'Invalid Brightness',
        operation: 'set_brightness',
        entityId: 'light.test',
        brightness: 300,
        enabled: true,
      };

      const actionUnder = {
        id: 'test-2',
        type: 'home_assistant',
        name: 'Invalid Brightness',
        operation: 'set_brightness',
        entityId: 'light.test',
        brightness: -10,
        enabled: true,
      };

      expect(homeAssistantActionSchema.safeParse(actionOver).success).toBe(false);
      expect(homeAssistantActionSchema.safeParse(actionUnder).success).toBe(false);
    });

    it('should accept optional customService for custom operation', () => {
      const action = {
        id: 'test-1',
        type: 'home_assistant',
        name: 'Custom Service',
        operation: 'custom',
        entityId: 'light.strip',
        customService: {
          domain: 'light',
          service: 'turn_on',
          data: { brightness: 200, transition: 2 },
        },
        enabled: true,
      };

      const result = homeAssistantActionSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customService).toEqual({
          domain: 'light',
          service: 'turn_on',
          data: { brightness: 200, transition: 2 },
        });
      }
    });

    it('should require entityId field', () => {
      const action = {
        id: 'test-1',
        type: 'home_assistant',
        name: 'Missing Entity',
        operation: 'toggle',
        enabled: true,
      };

      const result = homeAssistantActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('should reject empty entityId', () => {
      const action = {
        id: 'test-1',
        type: 'home_assistant',
        name: 'Empty Entity',
        operation: 'toggle',
        entityId: '',
        enabled: true,
      };

      const result = homeAssistantActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('should reject invalid operation type', () => {
      const action = {
        id: 'test-1',
        type: 'home_assistant',
        name: 'Invalid Op',
        operation: 'invalid_operation',
        entityId: 'light.test',
        enabled: true,
      };

      const result = homeAssistantActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('should validate through actionSchema discriminated union', () => {
      const action = {
        id: 'test-1',
        type: 'home_assistant',
        name: 'HA via Union',
        operation: 'toggle',
        entityId: 'switch.fan',
        enabled: true,
      };

      const result = actionSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('home_assistant');
      }
    });
  });
});
