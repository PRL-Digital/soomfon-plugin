/**
 * Node-RED Webhook Client
 * Axios-based client for triggering Node-RED flows via HTTP webhooks
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

/** Webhook trigger result */
export interface WebhookResult {
  /** Whether the webhook call succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Response data from the webhook (if any) */
  data?: unknown;
  /** HTTP status code */
  statusCode?: number;
}

/** Connection check result */
export interface NodeRedConnectionCheckResult {
  /** Whether connection was successful */
  connected: boolean;
  /** Node-RED version (if available from /settings endpoint) */
  version?: string;
  /** Error message (if not connected) */
  error?: string;
}

/** Node-RED settings response type */
interface NodeRedSettingsResponse {
  httpNodeRoot?: string;
  version?: string;
  [key: string]: unknown;
}

/**
 * Node-RED Webhook Client
 * Provides methods for triggering Node-RED flows via HTTP webhooks
 */
export class NodeRedClient {
  private client: AxiosInstance | null = null;
  private baseUrl: string = '';
  private username: string = '';
  private password: string = '';
  private configured: boolean = false;

  /**
   * Configure the client with Node-RED URL and optional authentication
   * @param url Node-RED server URL (e.g., 'http://localhost:1880')
   * @param username Optional username for basic auth
   * @param password Optional password for basic auth
   */
  configure(url: string, username?: string, password?: string): void {
    // Normalize URL - remove trailing slash
    this.baseUrl = url.replace(/\/+$/, '');
    this.username = username || '';
    this.password = password || '';

    // Create axios instance with optional auth
    const config: {
      baseURL: string;
      headers: Record<string, string>;
      timeout: number;
      auth?: { username: string; password: string };
    } = {
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };

    // Add basic auth if credentials provided
    if (this.username && this.password) {
      config.auth = {
        username: this.username,
        password: this.password,
      };
    }

    this.client = axios.create(config);
    this.configured = true;
  }

  /**
   * Check if the client is configured
   */
  isConfigured(): boolean {
    return this.configured && this.client !== null;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Test connection to Node-RED
   * @returns Connection result with version info or error
   */
  async checkConnection(): Promise<NodeRedConnectionCheckResult> {
    if (!this.isConfigured()) {
      return { connected: false, error: 'Client not configured' };
    }

    try {
      // Try to get Node-RED settings endpoint
      const response = await this.client!.get<NodeRedSettingsResponse>('/settings');

      return {
        connected: true,
        version: response.data.version,
      };
    } catch (error) {
      return {
        connected: false,
        error: this.formatError(error),
      };
    }
  }

  /**
   * Trigger a webhook endpoint
   * @param endpoint Webhook endpoint path (e.g., '/button-press' or 'my-flow')
   * @param payload Optional payload data to send
   * @returns Webhook result
   */
  async triggerWebhook(endpoint: string, payload?: Record<string, unknown>): Promise<WebhookResult> {
    this.ensureConfigured();

    try {
      // Normalize endpoint - ensure it starts with /
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

      const response = await this.client!.post(normalizedEndpoint, payload || {});

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          error: this.formatError(error),
          statusCode: error.response.status,
        };
      }
      return {
        success: false,
        error: this.formatError(error),
      };
    }
  }

  /**
   * Send a button press event to Node-RED
   * @param buttonIndex Button index (0-8)
   * @param endpoint Optional custom endpoint (defaults to /button-press)
   */
  async sendButtonPress(buttonIndex: number, endpoint: string = '/button-press'): Promise<WebhookResult> {
    return this.triggerWebhook(endpoint, {
      event: 'button_press',
      buttonIndex,
      timestamp: Date.now(),
    });
  }

  /**
   * Send an encoder event to Node-RED
   * @param encoderIndex Encoder index (0-2)
   * @param type Event type (press, release, rotate)
   * @param direction Rotation direction (cw, ccw) for rotate events
   * @param endpoint Optional custom endpoint (defaults to /encoder-event)
   */
  async sendEncoderEvent(
    encoderIndex: number,
    type: 'press' | 'release' | 'rotate',
    direction?: 'cw' | 'ccw',
    endpoint: string = '/encoder-event'
  ): Promise<WebhookResult> {
    return this.triggerWebhook(endpoint, {
      event: 'encoder_event',
      encoderIndex,
      type,
      direction,
      timestamp: Date.now(),
    });
  }

  /**
   * Send a custom event to Node-RED
   * @param eventName Name of the event
   * @param data Custom event data
   * @param endpoint Optional custom endpoint (defaults to /custom-event)
   */
  async sendCustomEvent(
    eventName: string,
    data?: Record<string, unknown>,
    endpoint: string = '/custom-event'
  ): Promise<WebhookResult> {
    return this.triggerWebhook(endpoint, {
      event: eventName,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Trigger a named flow (convenience method for trigger_flow operation)
   * @param flowName Name/endpoint of the flow to trigger
   * @param payload Optional payload data
   */
  async triggerFlow(flowName: string, payload?: Record<string, unknown>): Promise<WebhookResult> {
    return this.triggerWebhook(flowName, {
      action: 'trigger',
      ...payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Ensure the client is configured before making requests
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('Node-RED client not configured. Call configure() first.');
    }
  }

  /**
   * Format error message from axios error
   */
  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const status = axiosError.response.status;
        const statusText = axiosError.response.statusText;
        if (status === 401) {
          return 'Authentication failed - check your credentials';
        }
        if (status === 404) {
          return 'Webhook endpoint not found';
        }
        if (status === 500) {
          return 'Node-RED server error';
        }
        return `HTTP ${status}: ${statusText}`;
      }
      if (axiosError.code === 'ECONNREFUSED') {
        return 'Connection refused - check Node-RED URL';
      }
      if (axiosError.code === 'ENOTFOUND') {
        return 'Host not found - check Node-RED URL';
      }
      if (axiosError.code === 'ETIMEDOUT') {
        return 'Connection timed out';
      }
      return axiosError.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

// Singleton instance for global use
let defaultClient: NodeRedClient | null = null;

/**
 * Get the default Node-RED client instance
 */
export function getNodeRedClient(): NodeRedClient {
  if (!defaultClient) {
    defaultClient = new NodeRedClient();
  }
  return defaultClient;
}

/**
 * Create a new Node-RED client instance
 */
export function createNodeRedClient(): NodeRedClient {
  return new NodeRedClient();
}
