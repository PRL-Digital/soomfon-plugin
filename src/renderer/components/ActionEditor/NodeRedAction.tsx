import React, { useCallback, useState } from 'react';
import type { NodeRedAction, NodeRedOperationType } from '@shared/types/actions';

/** Available Node-RED operations */
const NR_OPERATIONS: Array<{ value: NodeRedOperationType; label: string; description: string }> = [
  { value: 'trigger_flow', label: 'Trigger Flow', description: 'Trigger a Node-RED flow via webhook' },
  { value: 'send_event', label: 'Send Event', description: 'Send a named event with data' },
  { value: 'custom', label: 'Custom Webhook', description: 'Send custom payload to any endpoint' },
];

/** Common endpoint examples */
const ENDPOINT_EXAMPLES = [
  { endpoint: '/button-press', description: 'Button press events' },
  { endpoint: '/encoder-event', description: 'Encoder events' },
  { endpoint: '/custom-event', description: 'Custom events' },
];

export interface NodeRedActionFormProps {
  /** Current configuration */
  config: Partial<NodeRedAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<NodeRedAction>) => void;
}

export const NodeRedActionForm: React.FC<NodeRedActionFormProps> = ({
  config,
  onChange,
}) => {
  const [payloadInput, setPayloadInput] = useState(
    config.payload ? JSON.stringify(config.payload, null, 2) : ''
  );

  // Handle operation change
  const handleOperationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const operation = e.target.value as NodeRedOperationType;
      const updates: Partial<NodeRedAction> = { ...config, operation };

      // Clear fields not relevant to the new operation
      if (operation !== 'send_event') {
        delete updates.eventName;
      }

      onChange(updates);
    },
    [config, onChange]
  );

  // Handle endpoint change
  const handleEndpointChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, endpoint: e.target.value });
    },
    [config, onChange]
  );

  // Handle event name change
  const handleEventNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, eventName: e.target.value });
    },
    [config, onChange]
  );

  // Handle payload change
  const handlePayloadChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setPayloadInput(value);

      if (!value.trim()) {
        const updates = { ...config };
        delete updates.payload;
        onChange(updates);
        return;
      }

      try {
        const payload = JSON.parse(value);
        onChange({ ...config, payload });
      } catch {
        // Keep invalid JSON in the input but don't update config
      }
    },
    [config, onChange]
  );

  // Quick fill endpoint
  const handleQuickFillEndpoint = useCallback(
    (endpoint: string) => {
      onChange({ ...config, endpoint });
    },
    [config, onChange]
  );

  const selectedOperation = config.operation || 'trigger_flow';
  const showEventName = selectedOperation === 'send_event';

  return (
    <div className="action-form action-form--node-red" data-testid="node-red-action-form">
      {/* Operation Selection */}
      <div className="action-form__row">
        <label className="action-form__label">Operation</label>
        <select
          className="action-form__select"
          value={selectedOperation}
          onChange={handleOperationChange}
          data-testid="nr-operation-select"
        >
          {NR_OPERATIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
        <span className="action-form__hint">
          {NR_OPERATIONS.find((op) => op.value === selectedOperation)?.description}
        </span>
      </div>

      {/* Endpoint */}
      <div className="action-form__row">
        <label className="action-form__label">Webhook Endpoint</label>
        <input
          type="text"
          className="action-form__input"
          value={config.endpoint || ''}
          onChange={handleEndpointChange}
          placeholder="/my-flow"
          data-testid="nr-endpoint-input"
        />
        <div className="nr-endpoint-examples">
          <span className="nr-endpoint-examples-label">Examples:</span>
          {ENDPOINT_EXAMPLES.map((ep) => (
            <button
              key={ep.endpoint}
              type="button"
              className="nr-endpoint-example-btn"
              onClick={() => handleQuickFillEndpoint(ep.endpoint)}
              title={ep.description}
              data-testid={`nr-endpoint-${ep.endpoint.replace('/', '')}`}
            >
              {ep.endpoint}
            </button>
          ))}
        </div>
      </div>

      {/* Event Name (for send_event operation) */}
      {showEventName && (
        <div className="action-form__row">
          <label className="action-form__label">Event Name</label>
          <input
            type="text"
            className="action-form__input"
            value={config.eventName || ''}
            onChange={handleEventNameChange}
            placeholder="button_pressed"
            data-testid="nr-event-name-input"
          />
          <span className="action-form__hint">
            Name of the event to send (e.g., button_pressed, scene_activated)
          </span>
        </div>
      )}

      {/* Payload Data (JSON) */}
      <div className="action-form__row">
        <label className="action-form__label">Payload (JSON)</label>
        <textarea
          className="action-form__textarea action-form__textarea--code"
          value={payloadInput}
          onChange={handlePayloadChange}
          placeholder={'{\n  "action": "toggle",\n  "target": "lights"\n}'}
          rows={4}
          spellCheck={false}
          data-testid="nr-payload-input"
        />
        <span className="action-form__hint">
          Optional JSON payload to send with the webhook request
        </span>
      </div>

      {/* Integration Status Hint */}
      <div className="action-form__row action-form__row--info">
        <div className="nr-integration-hint">
          <span className="nr-integration-hint__icon">🔗</span>
          <span className="nr-integration-hint__text">
            Configure Node-RED connection in Settings → Integrations
          </span>
        </div>
      </div>
    </div>
  );
};

export default NodeRedActionForm;
