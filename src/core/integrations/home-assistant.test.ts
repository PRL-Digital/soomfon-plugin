/**
 * Home Assistant Client Tests
 *
 * Tests for the Home Assistant REST API client that enables:
 * - Configuration and connection testing
 * - Entity state retrieval
 * - Service calls (toggle, turn on/off, brightness, scripts, automations)
 * - Error handling for network and API failures
 *
 * Why these tests matter:
 * The Home Assistant client is the foundation for all smart home integration.
 * Bugs in URL normalization, auth headers, or error handling could prevent
 * users from controlling their smart home devices or expose confusing errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  HomeAssistantClient,
  createHomeAssistantClient,
  getHomeAssistantClient,
} from './home-assistant';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: vi.fn((error) => error?.isAxiosError === true),
    },
    isAxiosError: vi.fn((error) => error?.isAxiosError === true),
  };
});

describe('HomeAssistantClient', () => {
  let client: HomeAssistantClient;
  let mockAxiosInstance: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new HomeAssistantClient();
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
    };
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('configure', () => {
    it('should configure the client with URL and token', () => {
      client.configure('http://homeassistant.local:8123', 'test-token');

      expect(client.isConfigured()).toBe(true);
      expect(client.getBaseUrl()).toBe('http://homeassistant.local:8123');
    });

    it('should normalize URL by removing trailing slash', () => {
      client.configure('http://homeassistant.local:8123/', 'test-token');

      expect(client.getBaseUrl()).toBe('http://homeassistant.local:8123');
    });

    it('should remove multiple trailing slashes', () => {
      client.configure('http://homeassistant.local:8123///', 'test-token');

      expect(client.getBaseUrl()).toBe('http://homeassistant.local:8123');
    });

    it('should create axios instance with correct headers', () => {
      client.configure('http://ha.local:8123', 'my-token-123');

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://ha.local:8123',
        headers: {
          'Authorization': 'Bearer my-token-123',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    });
  });

  describe('isConfigured', () => {
    it('should return false when not configured', () => {
      expect(client.isConfigured()).toBe(false);
    });

    it('should return true after configure is called', () => {
      client.configure('http://ha.local:8123', 'token');
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('getBaseUrl', () => {
    it('should return empty string when not configured', () => {
      expect(client.getBaseUrl()).toBe('');
    });

    it('should return configured URL', () => {
      client.configure('http://my-ha.local:8123', 'token');
      expect(client.getBaseUrl()).toBe('http://my-ha.local:8123');
    });
  });

  describe('checkConnection', () => {
    it('should return error when not configured', async () => {
      const result = await client.checkConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Client not configured',
      });
    });

    it('should return connected with version on success', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.get.mockImplementation((url: string) => {
        if (url === '/api/') return Promise.resolve({ data: { message: 'API running' } });
        if (url === '/api/config') return Promise.resolve({ data: { version: '2024.1.0' } });
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await client.checkConnection();

      expect(result).toEqual({
        connected: true,
        version: '2024.1.0',
      });
    });

    it('should return error on 401 unauthorized', async () => {
      client.configure('http://ha.local:8123', 'bad-token');
      const error = {
        isAxiosError: true,
        response: { status: 401, statusText: 'Unauthorized' },
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.checkConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Authentication failed - check your access token',
      });
    });

    it('should return error on connection refused', async () => {
      client.configure('http://ha.local:8123', 'token');
      const error = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.checkConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Connection refused - check Home Assistant URL',
      });
    });

    it('should return error on host not found', async () => {
      client.configure('http://invalid-host:8123', 'token');
      const error = {
        isAxiosError: true,
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND',
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.checkConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Host not found - check Home Assistant URL',
      });
    });

    it('should return error on timeout', async () => {
      client.configure('http://ha.local:8123', 'token');
      const error = {
        isAxiosError: true,
        code: 'ETIMEDOUT',
        message: 'timeout',
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.checkConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Connection timed out',
      });
    });
  });

  describe('getStates', () => {
    it('should throw when not configured', async () => {
      await expect(client.getStates()).rejects.toThrow(
        'Home Assistant client not configured. Call configure() first.'
      );
    });

    it('should return all entity states', async () => {
      client.configure('http://ha.local:8123', 'token');
      const mockStates = [
        { entity_id: 'light.living_room', state: 'on', attributes: {} },
        { entity_id: 'switch.fan', state: 'off', attributes: {} },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockStates });

      const result = await client.getStates();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/states');
      expect(result).toEqual(mockStates);
    });

    it('should throw formatted error on failure', async () => {
      client.configure('http://ha.local:8123', 'token');
      const error = {
        isAxiosError: true,
        response: { status: 500, statusText: 'Internal Server Error' },
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      await expect(client.getStates()).rejects.toThrow(
        'Failed to get states: HTTP 500: Internal Server Error'
      );
    });
  });

  describe('getState', () => {
    it('should throw when not configured', async () => {
      await expect(client.getState('light.bedroom')).rejects.toThrow(
        'Home Assistant client not configured. Call configure() first.'
      );
    });

    it('should return specific entity state', async () => {
      client.configure('http://ha.local:8123', 'token');
      const mockState = {
        entity_id: 'light.bedroom',
        state: 'on',
        attributes: { brightness: 200 },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockState });

      const result = await client.getState('light.bedroom');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/states/light.bedroom');
      expect(result).toEqual(mockState);
    });

    it('should throw formatted error for 404', async () => {
      client.configure('http://ha.local:8123', 'token');
      const error = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' },
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      await expect(client.getState('light.nonexistent')).rejects.toThrow(
        'Failed to get state for light.nonexistent: Entity or endpoint not found'
      );
    });
  });

  describe('callService', () => {
    it('should throw when not configured', async () => {
      await expect(
        client.callService({ domain: 'light', service: 'toggle' })
      ).rejects.toThrow('Home Assistant client not configured. Call configure() first.');
    });

    it('should call service with target entity', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      const result = await client.callService({
        domain: 'light',
        service: 'toggle',
        target: { entity_id: 'light.living_room' },
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/toggle', {
        entity_id: 'light.living_room',
      });
      expect(result).toEqual({ success: true, states: [] });
    });

    it('should call service with multiple targets', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.callService({
        domain: 'light',
        service: 'turn_on',
        target: {
          entity_id: ['light.room1', 'light.room2'],
          area_id: 'living_room',
        },
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/turn_on', {
        entity_id: ['light.room1', 'light.room2'],
        area_id: 'living_room',
      });
    });

    it('should include service data in payload', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.callService({
        domain: 'light',
        service: 'turn_on',
        target: { entity_id: 'light.desk' },
        data: { brightness: 200, transition: 2 },
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/turn_on', {
        entity_id: 'light.desk',
        brightness: 200,
        transition: 2,
      });
    });

    it('should return failure on error', async () => {
      client.configure('http://ha.local:8123', 'token');
      const error = {
        isAxiosError: true,
        response: { status: 400, statusText: 'Bad Request' },
      };
      mockAxiosInstance.post.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.callService({
        domain: 'light',
        service: 'toggle',
        target: { entity_id: 'light.room' },
      });

      expect(result).toEqual({
        success: false,
        error: 'HTTP 400: Bad Request',
      });
    });
  });

  describe('toggleLight', () => {
    it('should call light.toggle service', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.toggleLight('light.kitchen');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/toggle', {
        entity_id: 'light.kitchen',
      });
    });
  });

  describe('setLightBrightness', () => {
    it('should call light.turn_on with brightness', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.setLightBrightness('light.desk', 128);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/turn_on', {
        entity_id: 'light.desk',
        brightness: 128,
      });
    });

    it('should clamp brightness to 0', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.setLightBrightness('light.desk', -50);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/turn_on', {
        entity_id: 'light.desk',
        brightness: 0,
      });
    });

    it('should clamp brightness to 255', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.setLightBrightness('light.desk', 500);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/turn_on', {
        entity_id: 'light.desk',
        brightness: 255,
      });
    });

    it('should round non-integer brightness', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.setLightBrightness('light.desk', 127.7);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/turn_on', {
        entity_id: 'light.desk',
        brightness: 128,
      });
    });
  });

  describe('runScript', () => {
    it('should call script.turn_on with full entity ID', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.runScript('script.goodnight');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/script/turn_on', {
        entity_id: 'script.goodnight',
      });
    });

    it('should prefix script. if not present', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.runScript('goodnight');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/script/turn_on', {
        entity_id: 'script.goodnight',
      });
    });
  });

  describe('turnOn', () => {
    it('should extract domain from entity ID', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.turnOn('switch.fan');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/switch/turn_on', {
        entity_id: 'switch.fan',
      });
    });

    it('should use homeassistant domain for invalid entity ID', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.turnOn('invalid_entity_id');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/services/homeassistant/turn_on',
        { entity_id: 'invalid_entity_id' }
      );
    });
  });

  describe('turnOff', () => {
    it('should call domain.turn_off service', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.turnOff('light.bedroom');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/light/turn_off', {
        entity_id: 'light.bedroom',
      });
    });
  });

  describe('toggle', () => {
    it('should call domain.toggle service', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.toggle('cover.garage');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/services/cover/toggle', {
        entity_id: 'cover.garage',
      });
    });
  });

  describe('triggerAutomation', () => {
    it('should call automation.trigger service', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.post.mockResolvedValue({ data: [] });

      await client.triggerAutomation('automation.motion_lights');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/services/automation/trigger',
        { entity_id: 'automation.motion_lights' }
      );
    });
  });

  describe('error formatting', () => {
    it('should format standard Error objects', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.get.mockRejectedValue(new Error('Something went wrong'));
      vi.mocked(axios.isAxiosError).mockReturnValue(false);

      const result = await client.checkConnection();

      expect(result.error).toBe('Something went wrong');
    });

    it('should format non-Error values', async () => {
      client.configure('http://ha.local:8123', 'token');
      mockAxiosInstance.get.mockRejectedValue('string error');
      vi.mocked(axios.isAxiosError).mockReturnValue(false);

      const result = await client.checkConnection();

      expect(result.error).toBe('string error');
    });

    it('should format axios error with generic message', async () => {
      client.configure('http://ha.local:8123', 'token');
      const error = {
        isAxiosError: true,
        message: 'Request failed',
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.checkConnection();

      expect(result.error).toBe('Request failed');
    });
  });
});

describe('Factory functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createHomeAssistantClient', () => {
    it('should create a new client instance', () => {
      const client1 = createHomeAssistantClient();
      const client2 = createHomeAssistantClient();

      expect(client1).toBeInstanceOf(HomeAssistantClient);
      expect(client2).toBeInstanceOf(HomeAssistantClient);
      expect(client1).not.toBe(client2);
    });
  });

  describe('getHomeAssistantClient', () => {
    it('should return a client instance', () => {
      const client = getHomeAssistantClient();
      expect(client).toBeInstanceOf(HomeAssistantClient);
    });

    it('should return the same instance on subsequent calls', () => {
      const client1 = getHomeAssistantClient();
      const client2 = getHomeAssistantClient();

      expect(client1).toBe(client2);
    });
  });
});
