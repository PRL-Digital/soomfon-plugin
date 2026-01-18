/**
 * Node-RED Client Tests
 *
 * Tests for the Node-RED webhook client that enables:
 * - Configuration and connection testing
 * - Webhook triggering with payloads
 * - Convenience methods for button, encoder, and custom events
 * - Error handling for network and API failures
 *
 * Why these tests matter:
 * The Node-RED client enables powerful automation integrations.
 * Bugs in endpoint normalization, auth handling, or error formatting
 * could prevent users from triggering their Node-RED flows or cause
 * confusing error messages.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  NodeRedClient,
  createNodeRedClient,
  getNodeRedClient,
} from './node-red';

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

describe('NodeRedClient', () => {
  let client: NodeRedClient;
  let mockAxiosInstance: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new NodeRedClient();
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
    it('should configure the client with URL only', () => {
      client.configure('http://localhost:1880');

      expect(client.isConfigured()).toBe(true);
      expect(client.getBaseUrl()).toBe('http://localhost:1880');
    });

    it('should configure with URL and credentials', () => {
      client.configure('http://localhost:1880', 'admin', 'password123');

      expect(client.isConfigured()).toBe(true);
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            username: 'admin',
            password: 'password123',
          },
        })
      );
    });

    it('should normalize URL by removing trailing slash', () => {
      client.configure('http://localhost:1880/');

      expect(client.getBaseUrl()).toBe('http://localhost:1880');
    });

    it('should remove multiple trailing slashes', () => {
      client.configure('http://localhost:1880///');

      expect(client.getBaseUrl()).toBe('http://localhost:1880');
    });

    it('should create axios instance with correct config', () => {
      client.configure('http://node-red.local:1880');

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://node-red.local:1880',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    });

    it('should not include auth when no credentials provided', () => {
      client.configure('http://localhost:1880');

      expect(axios.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          auth: expect.anything(),
        })
      );
    });

    it('should not include auth when only username provided', () => {
      client.configure('http://localhost:1880', 'admin', '');

      expect(axios.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          auth: expect.anything(),
        })
      );
    });
  });

  describe('isConfigured', () => {
    it('should return false when not configured', () => {
      expect(client.isConfigured()).toBe(false);
    });

    it('should return true after configure is called', () => {
      client.configure('http://localhost:1880');
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('getBaseUrl', () => {
    it('should return empty string when not configured', () => {
      expect(client.getBaseUrl()).toBe('');
    });

    it('should return configured URL', () => {
      client.configure('http://my-node-red:1880');
      expect(client.getBaseUrl()).toBe('http://my-node-red:1880');
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
      client.configure('http://localhost:1880');
      mockAxiosInstance.get.mockResolvedValue({
        data: { version: '3.1.0', httpNodeRoot: '/' },
      });

      const result = await client.checkConnection();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/settings');
      expect(result).toEqual({
        connected: true,
        version: '3.1.0',
      });
    });

    it('should return connected without version if not in response', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.get.mockResolvedValue({ data: { httpNodeRoot: '/' } });

      const result = await client.checkConnection();

      expect(result).toEqual({
        connected: true,
        version: undefined,
      });
    });

    it('should return error on 401 unauthorized', async () => {
      client.configure('http://localhost:1880', 'admin', 'wrong-password');
      const error = {
        isAxiosError: true,
        response: { status: 401, statusText: 'Unauthorized' },
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.checkConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Authentication failed - check your credentials',
      });
    });

    it('should return error on connection refused', async () => {
      client.configure('http://localhost:1880');
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
        error: 'Connection refused - check Node-RED URL',
      });
    });

    it('should return error on host not found', async () => {
      client.configure('http://invalid-host:1880');
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
        error: 'Host not found - check Node-RED URL',
      });
    });

    it('should return error on timeout', async () => {
      client.configure('http://localhost:1880');
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

  describe('triggerWebhook', () => {
    it('should throw when not configured', async () => {
      await expect(client.triggerWebhook('/test')).rejects.toThrow(
        'Node-RED client not configured. Call configure() first.'
      );
    });

    it('should POST to endpoint with payload', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: { result: 'ok' }, status: 200 });

      const result = await client.triggerWebhook('/my-webhook', { key: 'value' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/my-webhook', { key: 'value' });
      expect(result).toEqual({
        success: true,
        data: { result: 'ok' },
        statusCode: 200,
      });
    });

    it('should send empty object when no payload provided', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.triggerWebhook('/my-webhook');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/my-webhook', {});
    });

    it('should normalize endpoint without leading slash', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.triggerWebhook('my-webhook');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/my-webhook', {});
    });

    it('should return failure with status code on HTTP error', async () => {
      client.configure('http://localhost:1880');
      const error = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' },
      };
      mockAxiosInstance.post.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.triggerWebhook('/nonexistent');

      expect(result).toEqual({
        success: false,
        error: 'Webhook endpoint not found',
        statusCode: 404,
      });
    });

    it('should return failure without status code on network error', async () => {
      client.configure('http://localhost:1880');
      const error = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };
      mockAxiosInstance.post.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.triggerWebhook('/test');

      expect(result).toEqual({
        success: false,
        error: 'Connection refused - check Node-RED URL',
      });
    });

    it('should handle 500 server error', async () => {
      client.configure('http://localhost:1880');
      const error = {
        isAxiosError: true,
        response: { status: 500, statusText: 'Internal Server Error' },
      };
      mockAxiosInstance.post.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.triggerWebhook('/test');

      expect(result).toEqual({
        success: false,
        error: 'Node-RED server error',
        statusCode: 500,
      });
    });
  });

  describe('sendButtonPress', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-16T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send button press to default endpoint', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendButtonPress(3);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/button-press', {
        event: 'button_press',
        buttonIndex: 3,
        timestamp: Date.now(),
      });
    });

    it('should send button press to custom endpoint', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendButtonPress(5, '/custom-button');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/custom-button', {
        event: 'button_press',
        buttonIndex: 5,
        timestamp: Date.now(),
      });
    });
  });

  describe('sendEncoderEvent', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-16T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send encoder press event', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendEncoderEvent(1, 'press');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/encoder-event', {
        event: 'encoder_event',
        encoderIndex: 1,
        type: 'press',
        direction: undefined,
        timestamp: Date.now(),
      });
    });

    it('should send encoder release event', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendEncoderEvent(0, 'release');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/encoder-event', {
        event: 'encoder_event',
        encoderIndex: 0,
        type: 'release',
        direction: undefined,
        timestamp: Date.now(),
      });
    });

    it('should send encoder rotate clockwise event', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendEncoderEvent(2, 'rotate', 'cw');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/encoder-event', {
        event: 'encoder_event',
        encoderIndex: 2,
        type: 'rotate',
        direction: 'cw',
        timestamp: Date.now(),
      });
    });

    it('should send encoder rotate counter-clockwise event', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendEncoderEvent(0, 'rotate', 'ccw');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/encoder-event', {
        event: 'encoder_event',
        encoderIndex: 0,
        type: 'rotate',
        direction: 'ccw',
        timestamp: Date.now(),
      });
    });

    it('should send to custom endpoint', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendEncoderEvent(1, 'press', undefined, '/custom-encoder');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/custom-encoder', expect.any(Object));
    });
  });

  describe('sendCustomEvent', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-16T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send custom event with name only', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendCustomEvent('my_event');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/custom-event', {
        event: 'my_event',
        data: undefined,
        timestamp: Date.now(),
      });
    });

    it('should send custom event with data', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendCustomEvent('user_action', { action: 'click', target: 'button' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/custom-event', {
        event: 'user_action',
        data: { action: 'click', target: 'button' },
        timestamp: Date.now(),
      });
    });

    it('should send to custom endpoint', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.sendCustomEvent('test', { value: 1 }, '/events');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/events', expect.any(Object));
    });
  });

  describe('triggerFlow', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-16T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should trigger flow with action marker', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.triggerFlow('my-flow');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/my-flow', {
        action: 'trigger',
        timestamp: Date.now(),
      });
    });

    it('should trigger flow with additional payload', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.triggerFlow('lights-flow', { room: 'living', brightness: 50 });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/lights-flow', {
        action: 'trigger',
        room: 'living',
        brightness: 50,
        timestamp: Date.now(),
      });
    });

    it('should handle flow names with leading slash', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.post.mockResolvedValue({ data: null, status: 200 });

      await client.triggerFlow('/api/flow');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/flow', expect.any(Object));
    });
  });

  describe('error formatting', () => {
    it('should format standard Error objects', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.get.mockRejectedValue(new Error('Something went wrong'));
      vi.mocked(axios.isAxiosError).mockReturnValue(false);

      const result = await client.checkConnection();

      expect(result.error).toBe('Something went wrong');
    });

    it('should format non-Error values', async () => {
      client.configure('http://localhost:1880');
      mockAxiosInstance.get.mockRejectedValue('string error');
      vi.mocked(axios.isAxiosError).mockReturnValue(false);

      const result = await client.checkConnection();

      expect(result.error).toBe('string error');
    });

    it('should format axios error with generic HTTP status', async () => {
      client.configure('http://localhost:1880');
      const error = {
        isAxiosError: true,
        response: { status: 418, statusText: "I'm a teapot" },
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.checkConnection();

      expect(result.error).toBe("HTTP 418: I'm a teapot");
    });

    it('should format axios error without response', async () => {
      client.configure('http://localhost:1880');
      const error = {
        isAxiosError: true,
        message: 'Network Error',
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      const result = await client.checkConnection();

      expect(result.error).toBe('Network Error');
    });
  });
});

describe('Factory functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNodeRedClient', () => {
    it('should create a new client instance', () => {
      const client1 = createNodeRedClient();
      const client2 = createNodeRedClient();

      expect(client1).toBeInstanceOf(NodeRedClient);
      expect(client2).toBeInstanceOf(NodeRedClient);
      expect(client1).not.toBe(client2);
    });
  });

  describe('getNodeRedClient', () => {
    it('should return a client instance', () => {
      const client = getNodeRedClient();
      expect(client).toBeInstanceOf(NodeRedClient);
    });

    it('should return the same instance on subsequent calls', () => {
      const client1 = getNodeRedClient();
      const client2 = getNodeRedClient();

      expect(client1).toBe(client2);
    });
  });
});
