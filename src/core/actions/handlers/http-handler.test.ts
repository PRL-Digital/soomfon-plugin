/**
 * HttpHandler Tests
 *
 * Tests for the HTTP action handler that enables:
 * - Making HTTP requests (GET, POST, PUT, DELETE, PATCH)
 * - Custom headers and body types (JSON, form)
 * - Request cancellation and timeout handling
 *
 * Why these tests matter:
 * HttpHandler allows users to trigger webhooks, APIs, and web services
 * via stream deck buttons. Bugs could cause failed requests, data loss,
 * or security issues.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpHandler, createHttpHandler, HttpResponseData } from './http-handler';
import { HttpAction } from '../../../shared/types/actions';

// Mock axios module
const mockCancelTokenSource = {
  token: 'mock-token',
  cancel: vi.fn(),
};

vi.mock('axios', () => {
  const mockAxios = vi.fn();
  (mockAxios as unknown as { CancelToken: { source: () => typeof mockCancelTokenSource } }).CancelToken = {
    source: () => mockCancelTokenSource,
  };
  (mockAxios as unknown as { isCancel: (error: unknown) => boolean }).isCancel = (error: unknown) => {
    return error instanceof Error && error.message === 'cancelled';
  };
  (mockAxios as unknown as { isAxiosError: (error: unknown) => boolean }).isAxiosError = (error: unknown) => {
    return error instanceof Error && 'isAxiosError' in error;
  };
  return { default: mockAxios };
});

// Import after mocking
import axios from 'axios';

// Helper to create a mock HttpAction
const createMockHttpAction = (overrides?: Partial<HttpAction>): HttpAction => ({
  id: 'action-1',
  type: 'http',
  name: 'HTTP Action',
  enabled: true,
  method: 'GET',
  url: 'https://api.example.com/test',
  ...overrides,
});

// Helper to create a mock axios response
const createMockResponse = (overrides?: Partial<{
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
}>) => ({
  status: 200,
  statusText: 'OK',
  data: { success: true },
  headers: { 'content-type': 'application/json' },
  ...overrides,
});

// Helper to create an axios error with response
const createAxiosError = (status: number, statusText: string, data?: unknown) => {
  const error = new Error(`Request failed with status ${status}`) as Error & {
    isAxiosError: boolean;
    response: ReturnType<typeof createMockResponse>;
  };
  error.isAxiosError = true;
  error.response = createMockResponse({ status, statusText, data });
  return error;
};

describe('HttpHandler', () => {
  let handler: HttpHandler;

  beforeEach(() => {
    handler = new HttpHandler();
    vi.clearAllMocks();
    vi.mocked(axios).mockResolvedValue(createMockResponse());
    mockCancelTokenSource.cancel.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and actionType', () => {
    it('should have actionType "http"', () => {
      expect(handler.actionType).toBe('http');
    });

    it('should be created via factory function', () => {
      const factoryHandler = createHttpHandler();
      expect(factoryHandler).toBeInstanceOf(HttpHandler);
      expect(factoryHandler.actionType).toBe('http');
    });
  });

  describe('execute', () => {
    it('should successfully execute GET request', async () => {
      const action = createMockHttpAction({ method: 'GET' });
      vi.mocked(axios).mockResolvedValue(createMockResponse({
        status: 200,
        statusText: 'OK',
        data: { result: 'success' },
      }));

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect((result.data as HttpResponseData).statusCode).toBe(200);
      expect((result.data as HttpResponseData).body).toEqual({ result: 'success' });
    });

    it('should execute POST request with JSON body', async () => {
      const action = createMockHttpAction({
        method: 'POST',
        body: { key: 'value' },
        bodyType: 'json',
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: { key: 'value' },
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should execute POST request with JSON string body', async () => {
      const action = createMockHttpAction({
        method: 'POST',
        body: '{"key": "value"}',
        bodyType: 'json',
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { key: 'value' },
        })
      );
    });

    it('should handle invalid JSON string body gracefully', async () => {
      const action = createMockHttpAction({
        method: 'POST',
        body: 'not valid json',
        bodyType: 'json',
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'not valid json',
        })
      );
    });

    it('should execute POST request with form body', async () => {
      const action = createMockHttpAction({
        method: 'POST',
        body: { username: 'test', password: 'secret' },
        bodyType: 'form',
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          data: 'username=test&password=secret',
        })
      );
    });

    it('should execute POST request with string form body', async () => {
      const action = createMockHttpAction({
        method: 'POST',
        body: 'already=encoded&string=value',
        bodyType: 'form',
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'already=encoded&string=value',
        })
      );
    });

    it('should execute PUT request', async () => {
      const action = createMockHttpAction({
        method: 'PUT',
        body: { update: true },
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should execute PATCH request', async () => {
      const action = createMockHttpAction({
        method: 'PATCH',
        body: { partial: 'update' },
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should execute DELETE request with body', async () => {
      const action = createMockHttpAction({
        method: 'DELETE',
        body: { id: 123 },
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse({ status: 204, statusText: 'No Content' }));

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
    });

    it('should include custom headers', async () => {
      const action = createMockHttpAction({
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      await handler.execute(action);

      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should use custom timeout', async () => {
      const action = createMockHttpAction({
        timeout: 5000,
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      await handler.execute(action);

      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    it('should use default timeout when not specified', async () => {
      const action = createMockHttpAction({
        timeout: undefined,
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      await handler.execute(action);

      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should fail when URL is missing', async () => {
      const action = createMockHttpAction({
        url: '',
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('URL is required for HTTP action');
    });

    it('should handle HTTP error responses', async () => {
      const action = createMockHttpAction();
      vi.mocked(axios).mockRejectedValue(createAxiosError(404, 'Not Found', { error: 'Resource not found' }));

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('HTTP 404: Not Found');
      expect((result.data as HttpResponseData).statusCode).toBe(404);
    });

    it('should handle network errors', async () => {
      const action = createMockHttpAction();
      vi.mocked(axios).mockRejectedValue(new Error('Network error'));

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Network error');
    });

    it('should handle request cancellation', async () => {
      const action = createMockHttpAction();
      const cancelError = new Error('cancelled');
      vi.mocked(axios).mockRejectedValue(cancelError);

      const result = await handler.execute(action);

      expect(result.status).toBe('cancelled');
      expect(result.error).toBe('Request cancelled');
    });

    it('should include accurate timing information', async () => {
      const action = createMockHttpAction();
      vi.mocked(axios).mockResolvedValue(createMockResponse());
      const beforeExec = Date.now();

      const result = await handler.execute(action);

      const afterExec = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.startTime).toBeLessThanOrEqual(afterExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });

    it('should preserve action id in result', async () => {
      const action = createMockHttpAction({ id: 'custom-action-id' });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      const result = await handler.execute(action);

      expect(result.actionId).toBe('custom-action-id');
    });

    it('should normalize response headers', async () => {
      const action = createMockHttpAction();
      vi.mocked(axios).mockResolvedValue(createMockResponse({
        headers: {
          'content-type': 'application/json',
          'x-custom': 'value',
        },
      }));

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      const responseData = result.data as HttpResponseData;
      expect(responseData.headers).toEqual({
        'content-type': 'application/json',
        'x-custom': 'value',
      });
    });

    it('should handle array headers', async () => {
      const action = createMockHttpAction();
      vi.mocked(axios).mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {
          'set-cookie': ['cookie1=value1', 'cookie2=value2'],
        },
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      const responseData = result.data as HttpResponseData;
      expect(responseData.headers['set-cookie']).toBe('cookie1=value1, cookie2=value2');
    });

    it('should not add body for GET request', async () => {
      const action = createMockHttpAction({
        method: 'GET',
        body: { shouldNotAppear: true },
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      await handler.execute(action);

      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.not.objectContaining({
          data: expect.anything(),
        })
      );
    });

    it('should use json as default body type', async () => {
      const action = createMockHttpAction({
        method: 'POST',
        body: { key: 'value' },
        bodyType: undefined,
      });
      vi.mocked(axios).mockResolvedValue(createMockResponse());

      await handler.execute(action);

      expect(vi.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      const action = createMockHttpAction();
      vi.mocked(axios).mockRejectedValue('String error');

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('String error');
    });
  });

  describe('cancel', () => {
    it('should cancel active request', async () => {
      const action = createMockHttpAction();

      // Start a request that will take a long time
      let resolveRequest: () => void;
      vi.mocked(axios).mockImplementation(() => new Promise((resolve) => {
        resolveRequest = () => resolve(createMockResponse());
      }));

      const executePromise = handler.execute(action);

      // Cancel the request
      await handler.cancel();

      expect(mockCancelTokenSource.cancel).toHaveBeenCalledWith('Request cancelled by user');

      // Resolve the request to clean up
      resolveRequest!();
      await executePromise;
    });

    it('should do nothing when no request is active', async () => {
      await handler.cancel();
      // Should not throw
    });
  });
});
