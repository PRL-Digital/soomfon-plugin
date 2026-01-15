/**
 * Node-RED Action Handler
 * Executes Node-RED operations using the Node-RED webhook client
 */

import {
  NodeRedAction,
  ActionHandler,
  ActionExecutionResult,
} from '../../../shared/types/actions';
import {
  NodeRedClient,
  getNodeRedClient,
  WebhookResult,
} from '../../integrations/node-red';
import { ConfigManager } from '../../config/config-manager';

/** Response data returned from Node-RED handler execution */
export interface NodeRedResponseData {
  /** Operation that was performed */
  operation: string;
  /** Endpoint that was called */
  endpoint: string;
  /** Whether the webhook call succeeded */
  success: boolean;
  /** Response data from the webhook */
  responseData?: unknown;
  /** HTTP status code */
  statusCode?: number;
}

/**
 * Node-RED Action Handler
 * Handles Node-RED operations like triggering flows and sending events
 */
export class NodeRedHandler implements ActionHandler<NodeRedAction> {
  readonly actionType = 'node_red' as const;

  private client: NodeRedClient;
  private configManager: ConfigManager | null = null;

  constructor(configManager?: ConfigManager) {
    this.client = getNodeRedClient();
    this.configManager = configManager ?? null;
  }

  /**
   * Execute a Node-RED action
   * @param action The Node-RED action to execute
   * @returns Execution result with response data
   */
  async execute(action: NodeRedAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate action is enabled
      if (action.enabled === false) {
        return this.createResult(action.id, startTime, 'cancelled', 'Action is disabled');
      }

      // Ensure client is configured
      await this.ensureClientConfigured();

      // Validate endpoint
      if (!action.endpoint) {
        throw new Error('Webhook endpoint is required');
      }

      // Execute the operation
      let result: WebhookResult;

      switch (action.operation) {
        case 'trigger_flow':
          result = await this.client.triggerFlow(action.endpoint, action.payload);
          break;

        case 'send_event':
          if (!action.eventName) {
            throw new Error('Event name is required for send_event operation');
          }
          result = await this.client.sendCustomEvent(
            action.eventName,
            action.payload,
            action.endpoint
          );
          break;

        case 'custom':
          result = await this.client.triggerWebhook(action.endpoint, action.payload);
          break;

        default:
          throw new Error(`Unknown operation: ${action.operation}`);
      }

      // Build response data
      const responseData: NodeRedResponseData = {
        operation: action.operation,
        endpoint: action.endpoint,
        success: result.success,
        responseData: result.data,
        statusCode: result.statusCode,
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
   * Ensure the Node-RED client is configured with settings
   */
  private async ensureClientConfigured(): Promise<void> {
    if (this.client.isConfigured()) {
      return;
    }

    // Try to get config from ConfigManager
    if (this.configManager) {
      const integrations = this.configManager.getIntegrations();
      const nrSettings = integrations.nodeRed;

      if (!nrSettings.enabled) {
        throw new Error('Node-RED integration is not enabled');
      }

      if (!nrSettings.url) {
        throw new Error('Node-RED URL is required');
      }

      this.client.configure(nrSettings.url, nrSettings.username, nrSettings.password);
    } else {
      throw new Error('Node-RED client not configured and no config manager available');
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
    data?: NodeRedResponseData
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
 * Create a new Node-RED handler instance
 * @param configManager Optional ConfigManager for loading settings
 * @returns NodeRedHandler instance
 */
export function createNodeRedHandler(configManager?: ConfigManager): NodeRedHandler {
  return new NodeRedHandler(configManager);
}
