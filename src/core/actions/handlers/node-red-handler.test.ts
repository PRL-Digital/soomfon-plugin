/**
 * NodeRedHandler Tests
 *
 * Tests for the Node-RED action handler that enables:
 * - Triggering Node-RED flows via webhooks
 * - Sending custom events with payloads
 * - Integration with Node-RED automation platform
 *
 * Why these tests matter:
 * NodeRedHandler allows users to trigger Node-RED flows directly
 * from the stream deck. Bugs could fail to execute flows, send
 * wrong payloads, or expose configuration errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeRedHandler, createNodeRedHandler } from './node-red-handler';
import type { NodeRedAction } from '../../../shared/types/actions';
import type { ConfigManager } from '../../config/config-manager';
import type { IntegrationSettings } from '../../../shared/types/config';

// Mock the node-red client module
vi.mock('../../integrations/node-red', () => ({
  getNodeRedClient: vi.fn(() => mockNodeRedClient),
  NodeRedClient: vi.fn(),
}));

// Mock client instance
const mockNodeRedClient = {
  isConfigured: vi.fn(),
  configure: vi.fn(),
  triggerFlow: vi.fn(),
  sendCustomEvent: vi.fn(),
  triggerWebhook: vi.fn(),
};

// Helper to create a mock NodeRedAction
const createMockAction = (overrides?: Partial<NodeRedAction>): NodeRedAction => ({
  id: 'action-1',
  type: 'node_red',
  name: 'Test NR Action',
  enabled: true,
  operation: 'trigger_flow',
  endpoint: '/my-flow',
  ...overrides,
});

// Helper to create mock integration settings
const createMockIntegrationSettings = (overrides?: Partial<IntegrationSettings['nodeRed']>): IntegrationSettings => ({
  homeAssistant: {
    enabled: false,
  },
  nodeRed: {
    enabled: true,
    url: 'http://localhost:1880',
    username: 'admin',
    password: 'password123',
    ...overrides,
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

describe('NodeRedHandler', () => {
  let handler: NodeRedHandler;
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigManager = createMockConfigManager();
    handler = new NodeRedHandler(mockConfigManager);

    // Default: client is configured
    mockNodeRedClient.isConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and actionType', () => {
    it('should have actionType "node_red"', () => {
      expect(handler.actionType).toBe('node_red');
    });

    it('should be created via factory function', () => {
      const factoryHandler = createNodeRedHandler(mockConfigManager);
      expect(factoryHandler).toBeInstanceOf(NodeRedHandler);
      expect(factoryHandler.actionType).toBe('node_red');
    });
  });

  describe('execute - trigger_flow operation', () => {
    it('should successfully trigger a flow', async () => {
      mockNodeRedClient.triggerFlow.mockResolvedValue({ success: true, statusCode: 200 });
      const action = createMockAction({ operation: 'trigger_flow', endpoint: '/my-flow' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(mockNodeRedClient.triggerFlow).toHaveBeenCalledWith('/my-flow', undefined);
    });

    it('should pass payload when triggering a flow', async () => {
      mockNodeRedClient.triggerFlow.mockResolvedValue({ success: true, statusCode: 200 });
      const payload = { scene: 'movie_time', brightness: 50 };
      const action = createMockAction({ operation: 'trigger_flow', endpoint: '/scene', payload });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockNodeRedClient.triggerFlow).toHaveBeenCalledWith('/scene', payload);
    });

    it('should report failure when flow trigger fails', async () => {
      mockNodeRedClient.triggerFlow.mockResolvedValue({ success: false, error: 'Connection refused' });
      const action = createMockAction({ operation: 'trigger_flow' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Connection refused');
    });
  });

  describe('execute - send_event operation', () => {
    it('should successfully send an event', async () => {
      mockNodeRedClient.sendCustomEvent.mockResolvedValue({ success: true, statusCode: 200 });
      const action = createMockAction({
        operation: 'send_event',
        endpoint: '/events',
        eventName: 'button_pressed',
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockNodeRedClient.sendCustomEvent).toHaveBeenCalledWith(
        'button_pressed',
        undefined,
        '/events'
      );
    });

    it('should pass payload when sending an event', async () => {
      mockNodeRedClient.sendCustomEvent.mockResolvedValue({ success: true, statusCode: 200 });
      const payload = { buttonIndex: 3, source: 'streamdeck' };
      const action = createMockAction({
        operation: 'send_event',
        endpoint: '/events',
        eventName: 'button_pressed',
        payload,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockNodeRedClient.sendCustomEvent).toHaveBeenCalledWith(
        'button_pressed',
        payload,
        '/events'
      );
    });

    it('should fail when eventName is not specified for send_event operation', async () => {
      const action = createMockAction({
        operation: 'send_event',
        endpoint: '/events',
        eventName: undefined,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Event name is required for send_event operation');
    });
  });

  describe('execute - custom operation', () => {
    it('should successfully call a custom webhook', async () => {
      mockNodeRedClient.triggerWebhook.mockResolvedValue({ success: true, statusCode: 200, data: { result: 'ok' } });
      const action = createMockAction({
        operation: 'custom',
        endpoint: '/custom-endpoint',
        payload: { key: 'value' },
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockNodeRedClient.triggerWebhook).toHaveBeenCalledWith('/custom-endpoint', { key: 'value' });
    });

    it('should send custom webhook without payload', async () => {
      mockNodeRedClient.triggerWebhook.mockResolvedValue({ success: true, statusCode: 200 });
      const action = createMockAction({
        operation: 'custom',
        endpoint: '/ping',
        payload: undefined,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(mockNodeRedClient.triggerWebhook).toHaveBeenCalledWith('/ping', undefined);
    });
  });

  describe('execute - disabled action', () => {
    it('should return cancelled status for disabled action', async () => {
      const action = createMockAction({ enabled: false });

      const result = await handler.execute(action);

      expect(result.status).toBe('cancelled');
      expect(result.error).toBe('Action is disabled');
      expect(mockNodeRedClient.triggerFlow).not.toHaveBeenCalled();
    });
  });

  describe('execute - client configuration', () => {
    it('should configure client from ConfigManager when not configured', async () => {
      mockNodeRedClient.isConfigured.mockReturnValue(false);
      mockNodeRedClient.triggerFlow.mockResolvedValue({ success: true });
      const action = createMockAction();

      await handler.execute(action);

      expect(mockNodeRedClient.configure).toHaveBeenCalledWith(
        'http://localhost:1880',
        'admin',
        'password123'
      );
    });

    it('should fail when integration is not enabled', async () => {
      mockNodeRedClient.isConfigured.mockReturnValue(false);
      const disabledSettings = createMockIntegrationSettings({ enabled: false });
      const disabledConfigManager = createMockConfigManager(disabledSettings);
      const disabledHandler = new NodeRedHandler(disabledConfigManager);
      const action = createMockAction();

      const result = await disabledHandler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Node-RED integration is not enabled');
    });

    it('should fail when URL is missing', async () => {
      mockNodeRedClient.isConfigured.mockReturnValue(false);
      const noUrlSettings = createMockIntegrationSettings({ url: undefined });
      const noUrlConfigManager = createMockConfigManager(noUrlSettings);
      const noUrlHandler = new NodeRedHandler(noUrlConfigManager);
      const action = createMockAction();

      const result = await noUrlHandler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Node-RED URL is required');
    });

    it('should configure without auth when username/password not provided', async () => {
      mockNodeRedClient.isConfigured.mockReturnValue(false);
      mockNodeRedClient.triggerFlow.mockResolvedValue({ success: true });
      const noAuthSettings = createMockIntegrationSettings({ username: undefined, password: undefined });
      const noAuthConfigManager = createMockConfigManager(noAuthSettings);
      const noAuthHandler = new NodeRedHandler(noAuthConfigManager);
      const action = createMockAction();

      await noAuthHandler.execute(action);

      expect(mockNodeRedClient.configure).toHaveBeenCalledWith(
        'http://localhost:1880',
        undefined,
        undefined
      );
    });
  });

  describe('execute - timing', () => {
    it('should include accurate timing information', async () => {
      mockNodeRedClient.triggerFlow.mockResolvedValue({ success: true });
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
      mockNodeRedClient.triggerFlow.mockRejectedValue(new Error('Network timeout'));
      const action = createMockAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockNodeRedClient.triggerFlow.mockRejectedValue('String error');
      const action = createMockAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('String error');
    });

    it('should fail when endpoint is missing', async () => {
      const action = createMockAction({ endpoint: '' });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Webhook endpoint is required');
    });
  });

  describe('execute - response data', () => {
    it('should include operation details in response data', async () => {
      mockNodeRedClient.triggerFlow.mockResolvedValue({
        success: true,
        data: { message: 'Flow triggered' },
        statusCode: 200,
      });
      const action = createMockAction();

      const result = await handler.execute(action);

      expect(result.data).toEqual({
        operation: 'trigger_flow',
        endpoint: '/my-flow',
        success: true,
        responseData: { message: 'Flow triggered' },
        statusCode: 200,
      });
    });

    it('should include error details in response data for failures', async () => {
      mockNodeRedClient.triggerFlow.mockResolvedValue({
        success: false,
        error: 'Endpoint not found',
        statusCode: 404,
      });
      const action = createMockAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.data).toEqual({
        operation: 'trigger_flow',
        endpoint: '/my-flow',
        success: false,
        responseData: undefined,
        statusCode: 404,
      });
    });
  });
});
