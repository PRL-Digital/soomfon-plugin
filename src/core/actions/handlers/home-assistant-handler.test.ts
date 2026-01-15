/**
 * HomeAssistantHandler Tests
 *
 * Tests for the Home Assistant action handler that enables:
 * - Controlling Home Assistant entities via button press
 * - Toggle, turn on/off, brightness control, script execution
 * - Custom service calls for advanced automation
 *
 * Why these tests matter:
 * HomeAssistantHandler allows users to control their smart home directly
 * from the stream deck. Bugs could fail to execute automations, toggle
 * wrong entities, or expose sensitive configuration errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomeAssistantHandler, createHomeAssistantHandler } from './home-assistant-handler';
import type { HomeAssistantAction } from '../../../shared/types/actions';
import type { ConfigManager } from '../../config/config-manager';
import type { IntegrationSettings } from '../../../shared/types/config';

// Mock the home-assistant client module
vi.mock('../../integrations/home-assistant', () => ({
  getHomeAssistantClient: vi.fn(() => mockHomeAssistantClient),
  HomeAssistantClient: vi.fn(),
}));

// Mock client instance
const mockHomeAssistantClient = {
  isConfigured: vi.fn(),
  configure: vi.fn(),
  toggle: vi.fn(),
  turnOn: vi.fn(),
  turnOff: vi.fn(),
  setLightBrightness: vi.fn(),
  runScript: vi.fn(),
  triggerAutomation: vi.fn(),
  callService: vi.fn(),
};

// Helper to create a mock HomeAssistantAction
const createMockAction = (overrides?: Partial<HomeAssistantAction>): HomeAssistantAction => ({
  id: 'action-1',
  type: 'home_assistant',
  name: 'Test HA Action',
  enabled: true,
  operation: 'toggle',
  entityId: 'light.living_room',
  ...overrides,
});

// Helper to create mock integration settings
const createMockIntegrationSettings = (overrides?: Partial<IntegrationSettings['homeAssistant']>): IntegrationSettings => ({
  homeAssistant: {
    enabled: true,
    url: 'http://homeassistant.local:8123',
    accessToken: 'test-token-123',
    ...overrides,
  },
  nodeRed: {
    enabled: false,
  },
});

// Helper to create a mock ConfigManager
const createMockConfigManager = (integrationSettings?: IntegrationSettings): ConfigManager => ({
  getIntegrations: vi.fn().mockReturnValue(integrationSettings || createMockIntegrationSettings()),
  // Add other required methods as mocks
  getConfig: vi.fn(),
  getDeviceSettings: vi.fn(),
  getAppSettings: vi.fn(),
  setDeviceSettings: vi.fn(),
  setAppSettings: vi.fn(),
  setIntegrations: vi.fn(),
  resetToDefaults: vi.fn(),
  onChange: vi.fn().mockReturnValue(() => {}),
} as unknown as ConfigManager);

describe('HomeAssistantHandler', () => {
  let handler: HomeAssistantHandler;
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigManager = createMockConfigManager();
    handler = new HomeAssistantHandler(mockConfigManager);

    // Default: client is configured
    mockHomeAssistantClient.isConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and actionType', () => {
    it('should have actionType "home_assistant"', () => {
      expect(handler.actionType).toBe('home_assistant');
    });

    it('should be created via factory function', () => {
      const factoryHandler = createHomeAssistantHandler(mockConfigManager);
      expect(factoryHandler).toBeInstanceOf(HomeAssistantHandler);
      expect(factoryHandler.actionType).toBe('home_assistant');
    });
  });

  describe('execute - toggle operation', () => {
    it('should successfully toggle an entity', async () => {
      mockHomeAssistantClient.toggle.mockResolvedValue({ success: true });
      const action = createMockAction({ operation: 'toggle', entityId: 'light.bedroom' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(mockHomeAssistantClient.toggle).toHaveBeenCalledWith('light.bedroom');
    });

    it('should report failure when toggle fails', async () => {
      mockHomeAssistantClient.toggle.mockResolvedValue({ success: false, error: 'Entity not found' });
      const action = createMockAction({ operation: 'toggle' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Entity not found');
    });
  });

  describe('execute - turn_on operation', () => {
    it('should successfully turn on an entity', async () => {
      mockHomeAssistantClient.turnOn.mockResolvedValue({ success: true });
      const action = createMockAction({ operation: 'turn_on', entityId: 'switch.fan' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockHomeAssistantClient.turnOn).toHaveBeenCalledWith('switch.fan');
    });
  });

  describe('execute - turn_off operation', () => {
    it('should successfully turn off an entity', async () => {
      mockHomeAssistantClient.turnOff.mockResolvedValue({ success: true });
      const action = createMockAction({ operation: 'turn_off', entityId: 'switch.fan' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockHomeAssistantClient.turnOff).toHaveBeenCalledWith('switch.fan');
    });
  });

  describe('execute - set_brightness operation', () => {
    it('should successfully set light brightness', async () => {
      mockHomeAssistantClient.setLightBrightness.mockResolvedValue({ success: true });
      const action = createMockAction({
        operation: 'set_brightness',
        entityId: 'light.desk_lamp',
        brightness: 128,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockHomeAssistantClient.setLightBrightness).toHaveBeenCalledWith('light.desk_lamp', 128);
    });

    it('should fail when brightness is not specified', async () => {
      const action = createMockAction({
        operation: 'set_brightness',
        entityId: 'light.desk_lamp',
        brightness: undefined,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Brightness value is required for set_brightness operation');
    });
  });

  describe('execute - run_script operation', () => {
    it('should successfully run a script', async () => {
      mockHomeAssistantClient.runScript.mockResolvedValue({ success: true });
      const action = createMockAction({ operation: 'run_script', entityId: 'script.goodnight' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockHomeAssistantClient.runScript).toHaveBeenCalledWith('script.goodnight');
    });
  });

  describe('execute - trigger_automation operation', () => {
    it('should successfully trigger an automation', async () => {
      mockHomeAssistantClient.triggerAutomation.mockResolvedValue({ success: true });
      const action = createMockAction({
        operation: 'trigger_automation',
        entityId: 'automation.motion_lights',
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockHomeAssistantClient.triggerAutomation).toHaveBeenCalledWith('automation.motion_lights');
    });
  });

  describe('execute - custom operation', () => {
    it('should successfully call a custom service', async () => {
      mockHomeAssistantClient.callService.mockResolvedValue({ success: true });
      const action = createMockAction({
        operation: 'custom',
        entityId: 'light.strip',
        customService: {
          domain: 'light',
          service: 'turn_on',
          data: { brightness: 200, transition: 2 },
        },
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockHomeAssistantClient.callService).toHaveBeenCalledWith({
        domain: 'light',
        service: 'turn_on',
        target: { entity_id: 'light.strip' },
        data: { brightness: 200, transition: 2 },
      });
    });

    it('should fail when customService is not specified for custom operation', async () => {
      const action = createMockAction({
        operation: 'custom',
        entityId: 'light.strip',
        customService: undefined,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Custom service definition is required for custom operation');
    });
  });

  describe('execute - disabled action', () => {
    it('should return cancelled status for disabled action', async () => {
      const action = createMockAction({ enabled: false });

      const result = await handler.execute(action);

      expect(result.status).toBe('cancelled');
      expect(result.error).toBe('Action is disabled');
      expect(mockHomeAssistantClient.toggle).not.toHaveBeenCalled();
    });
  });

  describe('execute - client configuration', () => {
    it('should configure client from ConfigManager when not configured', async () => {
      mockHomeAssistantClient.isConfigured.mockReturnValue(false);
      mockHomeAssistantClient.toggle.mockResolvedValue({ success: true });
      const action = createMockAction();

      await handler.execute(action);

      expect(mockHomeAssistantClient.configure).toHaveBeenCalledWith(
        'http://homeassistant.local:8123',
        'test-token-123'
      );
    });

    it('should fail when integration is not enabled', async () => {
      mockHomeAssistantClient.isConfigured.mockReturnValue(false);
      const disabledSettings = createMockIntegrationSettings({ enabled: false });
      const disabledConfigManager = createMockConfigManager(disabledSettings);
      const disabledHandler = new HomeAssistantHandler(disabledConfigManager);
      const action = createMockAction();

      const result = await disabledHandler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Home Assistant integration is not enabled');
    });

    it('should fail when URL is missing', async () => {
      mockHomeAssistantClient.isConfigured.mockReturnValue(false);
      const noUrlSettings = createMockIntegrationSettings({ url: undefined });
      const noUrlConfigManager = createMockConfigManager(noUrlSettings);
      const noUrlHandler = new HomeAssistantHandler(noUrlConfigManager);
      const action = createMockAction();

      const result = await noUrlHandler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Home Assistant URL and access token are required');
    });

    it('should fail when access token is missing', async () => {
      mockHomeAssistantClient.isConfigured.mockReturnValue(false);
      const noTokenSettings = createMockIntegrationSettings({ accessToken: undefined });
      const noTokenConfigManager = createMockConfigManager(noTokenSettings);
      const noTokenHandler = new HomeAssistantHandler(noTokenConfigManager);
      const action = createMockAction();

      const result = await noTokenHandler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Home Assistant URL and access token are required');
    });
  });

  describe('execute - timing', () => {
    it('should include accurate timing information', async () => {
      mockHomeAssistantClient.toggle.mockResolvedValue({ success: true });
      const action = createMockAction();
      const beforeExec = Date.now();

      const result = await handler.execute(action);

      const afterExec = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.startTime).toBeLessThanOrEqual(afterExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });
  });

  describe('execute - error handling', () => {
    it('should handle client method throwing error', async () => {
      mockHomeAssistantClient.toggle.mockRejectedValue(new Error('Network timeout'));
      const action = createMockAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockHomeAssistantClient.toggle.mockRejectedValue('String error');
      const action = createMockAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('String error');
    });
  });

  describe('execute - response data', () => {
    it('should include operation details in response data', async () => {
      mockHomeAssistantClient.toggle.mockResolvedValue({
        success: true,
        states: [{ entity_id: 'light.living_room', state: 'on' }],
      });
      const action = createMockAction();

      const result = await handler.execute(action);

      expect(result.data).toEqual({
        operation: 'toggle',
        entityId: 'light.living_room',
        success: true,
        details: [{ entity_id: 'light.living_room', state: 'on' }],
      });
    });
  });
});
