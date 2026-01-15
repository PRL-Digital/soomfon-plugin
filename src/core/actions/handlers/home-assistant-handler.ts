/**
 * Home Assistant Action Handler
 * Executes Home Assistant operations using the Home Assistant REST API client
 */

import {
  HomeAssistantAction,
  ActionHandler,
  ActionExecutionResult,
} from '../../../shared/types/actions';
import {
  HomeAssistantClient,
  getHomeAssistantClient,
  ServiceCallResult,
} from '../../integrations/home-assistant';
import { ConfigManager } from '../../config/config-manager';

/** Response data returned from Home Assistant handler execution */
export interface HomeAssistantResponseData {
  /** Operation that was performed */
  operation: string;
  /** Target entity ID */
  entityId: string;
  /** Whether the service call succeeded */
  success: boolean;
  /** Additional details from the service call */
  details?: unknown;
}

/**
 * Home Assistant Action Handler
 * Handles Home Assistant operations like toggling lights, running scripts, etc.
 */
export class HomeAssistantHandler implements ActionHandler<HomeAssistantAction> {
  readonly actionType = 'home_assistant' as const;

  private client: HomeAssistantClient;
  private configManager: ConfigManager | null = null;

  constructor(configManager?: ConfigManager) {
    this.client = getHomeAssistantClient();
    this.configManager = configManager ?? null;
  }

  /**
   * Execute a Home Assistant action
   * @param action The Home Assistant action to execute
   * @returns Execution result with response data
   */
  async execute(action: HomeAssistantAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate action is enabled
      if (action.enabled === false) {
        return this.createResult(action.id, startTime, 'cancelled', 'Action is disabled');
      }

      // Ensure client is configured
      await this.ensureClientConfigured();

      // Validate entity ID
      if (!action.entityId) {
        throw new Error('Entity ID is required');
      }

      // Execute the operation
      let result: ServiceCallResult;

      switch (action.operation) {
        case 'toggle':
          result = await this.client.toggle(action.entityId);
          break;

        case 'turn_on':
          result = await this.client.turnOn(action.entityId);
          break;

        case 'turn_off':
          result = await this.client.turnOff(action.entityId);
          break;

        case 'set_brightness':
          if (action.brightness === undefined) {
            throw new Error('Brightness value is required for set_brightness operation');
          }
          result = await this.client.setLightBrightness(action.entityId, action.brightness);
          break;

        case 'run_script':
          result = await this.client.runScript(action.entityId);
          break;

        case 'trigger_automation':
          result = await this.client.triggerAutomation(action.entityId);
          break;

        case 'custom':
          if (!action.customService) {
            throw new Error('Custom service definition is required for custom operation');
          }
          result = await this.client.callService({
            domain: action.customService.domain,
            service: action.customService.service,
            target: { entity_id: action.entityId },
            data: action.customService.data,
          });
          break;

        default:
          throw new Error(`Unknown operation: ${action.operation}`);
      }

      // Build response data
      const responseData: HomeAssistantResponseData = {
        operation: action.operation,
        entityId: action.entityId,
        success: result.success,
        details: result.states || result.error,
      };

      if (result.success) {
        return this.createResult(action.id, startTime, 'success', undefined, responseData);
      } else {
        return this.createResult(action.id, startTime, 'failure', result.error, responseData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createResult(action.id, startTime, 'failure', errorMessage);
    }
  }

  /**
   * Ensure the Home Assistant client is configured with credentials
   */
  private async ensureClientConfigured(): Promise<void> {
    if (this.client.isConfigured()) {
      return;
    }

    // Try to get config from ConfigManager
    if (this.configManager) {
      const integrations = this.configManager.getIntegrations();
      const haSettings = integrations.homeAssistant;

      if (!haSettings.enabled) {
        throw new Error('Home Assistant integration is not enabled');
      }

      if (!haSettings.url || !haSettings.accessToken) {
        throw new Error('Home Assistant URL and access token are required');
      }

      this.client.configure(haSettings.url, haSettings.accessToken);
    } else {
      throw new Error('Home Assistant client not configured and no config manager available');
    }
  }

  /**
   * Create an execution result
   */
  private createResult(
    actionId: string,
    startTime: number,
    status: 'success' | 'failure' | 'cancelled',
    error?: string,
    data?: HomeAssistantResponseData
  ): ActionExecutionResult {
    const endTime = Date.now();
    return {
      status,
      actionId,
      startTime,
      endTime,
      duration: endTime - startTime,
      error,
      data,
    };
  }
}

/**
 * Create a new Home Assistant handler instance
 * @param configManager Optional ConfigManager for loading settings
 * @returns HomeAssistantHandler instance
 */
export function createHomeAssistantHandler(configManager?: ConfigManager): HomeAssistantHandler {
  return new HomeAssistantHandler(configManager);
}
