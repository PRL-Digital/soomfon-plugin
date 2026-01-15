/**
 * Home Assistant REST API Client
 * Axios-based client for interacting with Home Assistant instances
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

/** Entity state from Home Assistant */
export interface HomeAssistantState {
  /** Entity ID (e.g., 'light.living_room') */
  entity_id: string;
  /** Current state value (e.g., 'on', 'off', '25') */
  state: string;
  /** Entity attributes */
  attributes: Record<string, unknown>;
  /** Last changed timestamp */
  last_changed: string;
  /** Last updated timestamp */
  last_updated: string;
  /** Context information */
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

/** Service call parameters */
export interface ServiceCallParams {
  /** Service domain (e.g., 'light', 'switch', 'script') */
  domain: string;
  /** Service name (e.g., 'turn_on', 'turn_off', 'toggle') */
  service: string;
  /** Target entities or areas */
  target?: {
    entity_id?: string | string[];
    device_id?: string | string[];
    area_id?: string | string[];
  };
  /** Service-specific data */
  data?: Record<string, unknown>;
}

/** Service call result */
export interface ServiceCallResult {
  /** Whether the call succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Response states after service call */
  states?: HomeAssistantState[];
}

/** Home Assistant API info from /api/ endpoint */
export interface HomeAssistantApiInfo {
  /** API message */
  message: string;
}

/** Home Assistant config info from /api/config endpoint */
export interface HomeAssistantConfig {
  /** Configured latitude */
  latitude: number;
  /** Configured longitude */
  longitude: number;
  /** Elevation in meters */
  elevation: number;
  /** Location name */
  location_name: string;
  /** Time zone */
  time_zone: string;
  /** Home Assistant version */
  version: string;
  /** Unit system */
  unit_system: {
    length: string;
    mass: string;
    temperature: string;
    volume: string;
  };
}

/** Connection check result */
export interface ConnectionCheckResult {
  /** Whether connection was successful */
  connected: boolean;
  /** Home Assistant version (if connected) */
  version?: string;
  /** Error message (if not connected) */
  error?: string;
}

/**
 * Home Assistant REST API Client
 * Provides methods for interacting with Home Assistant instances
 */
export class HomeAssistantClient {
  private client: AxiosInstance | null = null;
  private baseUrl: string = '';
  private accessToken: string = '';
  private configured: boolean = false;

  /**
   * Configure the client with Home Assistant URL and access token
   * @param url Home Assistant server URL (e.g., 'http://homeassistant.local:8123')
   * @param accessToken Long-lived access token
   */
  configure(url: string, accessToken: string): void {
    // Normalize URL - remove trailing slash
    this.baseUrl = url.replace(/\/+$/, '');
    this.accessToken = accessToken;

    // Create axios instance with auth header
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

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
   * Test connection to Home Assistant
   * @returns Connection result with version info or error
   */
  async checkConnection(): Promise<ConnectionCheckResult> {
    if (!this.isConfigured()) {
      return { connected: false, error: 'Client not configured' };
    }

    try {
      // First check /api/ endpoint responds
      await this.client!.get<HomeAssistantApiInfo>('/api/');

      // Get version from /api/config
      const configResponse = await this.client!.get<HomeAssistantConfig>('/api/config');

      return {
        connected: true,
        version: configResponse.data.version,
      };
    } catch (error) {
      return {
        connected: false,
        error: this.formatError(error),
      };
    }
  }

  /**
   * Get all entity states from Home Assistant
   * @returns Array of all entity states
   */
  async getStates(): Promise<HomeAssistantState[]> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get<HomeAssistantState[]>('/api/states');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get states: ${this.formatError(error)}`);
    }
  }

  /**
   * Get state of a specific entity
   * @param entityId Entity ID (e.g., 'light.living_room')
   * @returns Entity state
   */
  async getState(entityId: string): Promise<HomeAssistantState> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get<HomeAssistantState>(`/api/states/${entityId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get state for ${entityId}: ${this.formatError(error)}`);
    }
  }

  /**
   * Call a Home Assistant service
   * @param params Service call parameters
   * @returns Service call result
   */
  async callService(params: ServiceCallParams): Promise<ServiceCallResult> {
    this.ensureConfigured();

    try {
      const { domain, service, target, data } = params;
      const payload: Record<string, unknown> = {};

      // Add target if specified
      if (target) {
        if (target.entity_id) payload.entity_id = target.entity_id;
        if (target.device_id) payload.device_id = target.device_id;
        if (target.area_id) payload.area_id = target.area_id;
      }

      // Add service data
      if (data) {
        Object.assign(payload, data);
      }

      const response = await this.client!.post<HomeAssistantState[]>(
        `/api/services/${domain}/${service}`,
        payload
      );

      return {
        success: true,
        states: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
      };
    }
  }

  /**
   * Toggle a light entity
   * @param entityId Light entity ID
   */
  async toggleLight(entityId: string): Promise<ServiceCallResult> {
    return this.callService({
      domain: 'light',
      service: 'toggle',
      target: { entity_id: entityId },
    });
  }

  /**
   * Set light brightness
   * @param entityId Light entity ID
   * @param brightness Brightness value (0-255)
   */
  async setLightBrightness(entityId: string, brightness: number): Promise<ServiceCallResult> {
    // Clamp brightness to valid range
    const clampedBrightness = Math.max(0, Math.min(255, Math.round(brightness)));

    return this.callService({
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: entityId },
      data: { brightness: clampedBrightness },
    });
  }

  /**
   * Run a Home Assistant script
   * @param entityId Script entity ID (e.g., 'script.my_script')
   */
  async runScript(entityId: string): Promise<ServiceCallResult> {
    // Script entity IDs should start with 'script.'
    const scriptId = entityId.startsWith('script.')
      ? entityId
      : `script.${entityId}`;

    return this.callService({
      domain: 'script',
      service: 'turn_on',
      target: { entity_id: scriptId },
    });
  }

  /**
   * Turn an entity on
   * @param entityId Entity ID
   */
  async turnOn(entityId: string): Promise<ServiceCallResult> {
    const domain = this.getDomain(entityId);
    return this.callService({
      domain,
      service: 'turn_on',
      target: { entity_id: entityId },
    });
  }

  /**
   * Turn an entity off
   * @param entityId Entity ID
   */
  async turnOff(entityId: string): Promise<ServiceCallResult> {
    const domain = this.getDomain(entityId);
    return this.callService({
      domain,
      service: 'turn_off',
      target: { entity_id: entityId },
    });
  }

  /**
   * Toggle an entity
   * @param entityId Entity ID
   */
  async toggle(entityId: string): Promise<ServiceCallResult> {
    const domain = this.getDomain(entityId);
    return this.callService({
      domain,
      service: 'toggle',
      target: { entity_id: entityId },
    });
  }

  /**
   * Trigger an automation
   * @param entityId Automation entity ID (e.g., 'automation.my_automation')
   */
  async triggerAutomation(entityId: string): Promise<ServiceCallResult> {
    return this.callService({
      domain: 'automation',
      service: 'trigger',
      target: { entity_id: entityId },
    });
  }

  /**
   * Extract domain from entity ID
   * @param entityId Entity ID (e.g., 'light.living_room')
   * @returns Domain (e.g., 'light')
   */
  private getDomain(entityId: string): string {
    const dotIndex = entityId.indexOf('.');
    if (dotIndex === -1) {
      return 'homeassistant'; // Default domain
    }
    return entityId.substring(0, dotIndex);
  }

  /**
   * Ensure the client is configured before making requests
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('Home Assistant client not configured. Call configure() first.');
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
          return 'Authentication failed - check your access token';
        }
        if (status === 404) {
          return 'Entity or endpoint not found';
        }
        return `HTTP ${status}: ${statusText}`;
      }
      if (axiosError.code === 'ECONNREFUSED') {
        return 'Connection refused - check Home Assistant URL';
      }
      if (axiosError.code === 'ENOTFOUND') {
        return 'Host not found - check Home Assistant URL';
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
let defaultClient: HomeAssistantClient | null = null;

/**
 * Get the default Home Assistant client instance
 */
export function getHomeAssistantClient(): HomeAssistantClient {
  if (!defaultClient) {
    defaultClient = new HomeAssistantClient();
  }
  return defaultClient;
}

/**
 * Create a new Home Assistant client instance
 */
export function createHomeAssistantClient(): HomeAssistantClient {
  return new HomeAssistantClient();
}
