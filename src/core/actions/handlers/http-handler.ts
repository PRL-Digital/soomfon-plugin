/**
 * HTTP Action Handler
 * Executes HTTP requests using axios with support for all methods, headers, and body types
 */

import axios, { AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios';
import {
  HttpAction,
  ActionHandler,
  ActionExecutionResult,
} from '../../../shared/types/actions';

/** Response data returned from HTTP handler execution */
export interface HttpResponseData {
  /** HTTP status code */
  statusCode: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body: unknown;
}

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000;

/**
 * HTTP Action Handler
 * Handles HTTP request actions with support for all methods, headers, and body types
 */
export class HttpHandler implements ActionHandler<HttpAction> {
  readonly actionType = 'http' as const;

  private cancelTokenSource: CancelTokenSource | null = null;

  /**
   * Execute an HTTP action
   * @param action The HTTP action to execute
   * @returns Execution result with response data
   */
  async execute(action: HttpAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate URL
      if (!action.url) {
        throw new Error('URL is required for HTTP action');
      }

      // Create cancel token for this request
      this.cancelTokenSource = axios.CancelToken.source();

      // Build request configuration
      const config = this.buildRequestConfig(action);

      // Execute the request
      const response = await axios(config);

      // Build response data
      const responseData = this.buildResponseData(response);

      const endTime = Date.now();
      return {
        status: 'success',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        data: responseData,
      };
    } catch (error) {
      const endTime = Date.now();

      // Check if request was cancelled
      if (axios.isCancel(error)) {
        return {
          status: 'cancelled',
          actionId: action.id,
          startTime,
          endTime,
          duration: endTime - startTime,
          error: 'Request cancelled',
        };
      }

      // Handle axios errors with response
      if (axios.isAxiosError(error) && error.response) {
        const responseData = this.buildResponseData(error.response);
        return {
          status: 'failure',
          actionId: action.id,
          startTime,
          endTime,
          duration: endTime - startTime,
          error: `HTTP ${error.response.status}: ${error.response.statusText}`,
          data: responseData,
        };
      }

      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failure',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        error: errorMessage,
      };
    } finally {
      this.cancelTokenSource = null;
    }
  }

  /**
   * Cancel the current HTTP request
   */
  async cancel(): Promise<void> {
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('Request cancelled by user');
    }
  }

  /**
   * Build axios request configuration from HttpAction
   * @param action The HTTP action
   * @returns Axios request configuration
   */
  private buildRequestConfig(action: HttpAction): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method: action.method,
      url: action.url,
      timeout: action.timeout ?? DEFAULT_TIMEOUT,
      cancelToken: this.cancelTokenSource?.token,
      // Don't throw on non-2xx status codes - we handle them manually
      validateStatus: () => true,
    };

    // Add headers if provided
    if (action.headers) {
      config.headers = { ...action.headers };
    }

    // Add body for methods that support it
    if (action.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(action.method)) {
      this.addRequestBody(config, action);
    }

    return config;
  }

  /**
   * Add request body to configuration based on body type
   * @param config Axios configuration to modify
   * @param action The HTTP action with body
   */
  private addRequestBody(config: AxiosRequestConfig, action: HttpAction): void {
    const bodyType = action.bodyType ?? 'json';

    if (bodyType === 'json') {
      // JSON body
      config.headers = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
      // If body is a string, parse it; otherwise use as-is
      if (typeof action.body === 'string') {
        try {
          config.data = JSON.parse(action.body);
        } catch {
          // If not valid JSON, send as-is
          config.data = action.body;
        }
      } else {
        config.data = action.body;
      }
    } else if (bodyType === 'form') {
      // Form URL-encoded body
      config.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...config.headers,
      };
      // Convert body to URL-encoded string
      if (typeof action.body === 'string') {
        config.data = action.body;
      } else if (typeof action.body === 'object' && action.body !== null) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(action.body)) {
          params.append(key, String(value));
        }
        config.data = params.toString();
      }
    }
  }

  /**
   * Build response data from axios response
   * @param response Axios response
   * @returns Normalized response data
   */
  private buildResponseData(response: AxiosResponse): HttpResponseData {
    // Normalize headers to Record<string, string>
    const headers: Record<string, string> = {};
    if (response.headers) {
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value.join(', ');
        }
      }
    }

    return {
      statusCode: response.status,
      statusText: response.statusText,
      headers,
      body: response.data,
    };
  }
}

/**
 * Create a new HTTP handler instance
 * @returns HttpHandler instance
 */
export function createHttpHandler(): HttpHandler {
  return new HttpHandler();
}
