import React, { useCallback, useState } from 'react';
import type {
  HomeAssistantAction,
  HomeAssistantOperationType,
  HomeAssistantCustomService,
} from '@shared/types/actions';

/** Available Home Assistant operations */
const HA_OPERATIONS: Array<{ value: HomeAssistantOperationType; label: string; description: string }> = [
  { value: 'toggle', label: 'Toggle', description: 'Toggle entity on/off' },
  { value: 'turn_on', label: 'Turn On', description: 'Turn entity on' },
  { value: 'turn_off', label: 'Turn Off', description: 'Turn entity off' },
  { value: 'set_brightness', label: 'Set Brightness', description: 'Set light brightness (0-255)' },
  { value: 'run_script', label: 'Run Script', description: 'Execute a Home Assistant script' },
  { value: 'trigger_automation', label: 'Trigger Automation', description: 'Trigger an automation' },
  { value: 'custom', label: 'Custom Service', description: 'Call any Home Assistant service' },
];

/** Common entity ID prefixes for hints */
const ENTITY_PREFIXES = [
  { prefix: 'light.', example: 'light.living_room' },
  { prefix: 'switch.', example: 'switch.bedroom_fan' },
  { prefix: 'script.', example: 'script.goodnight' },
  { prefix: 'automation.', example: 'automation.motion_lights' },
  { prefix: 'scene.', example: 'scene.movie_time' },
];

export interface HomeAssistantActionFormProps {
  /** Current configuration */
  config: Partial<HomeAssistantAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<HomeAssistantAction>) => void;
}

export const HomeAssistantActionForm: React.FC<HomeAssistantActionFormProps> = ({
  config,
  onChange,
}) => {
  const [customDataInput, setCustomDataInput] = useState(
    config.customService?.data ? JSON.stringify(config.customService.data, null, 2) : ''
  );

  // Handle operation change
  const handleOperationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const operation = e.target.value as HomeAssistantOperationType;
      const updates: Partial<HomeAssistantAction> = { ...config, operation };

      // Clear fields not relevant to the new operation
      if (operation !== 'set_brightness') {
        delete updates.brightness;
      }
      if (operation !== 'custom') {
        delete updates.customService;
      }

      onChange(updates);
    },
    [config, onChange]
  );

  // Handle entity ID change
  const handleEntityIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, entityId: e.target.value });
    },
    [config, onChange]
  );

  // Handle brightness change
  const handleBrightnessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      onChange({ ...config, brightness: isNaN(value) ? undefined : Math.max(0, Math.min(255, value)) });
    },
    [config, onChange]
  );

  // Handle custom service domain change
  const handleCustomDomainChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const customService: HomeAssistantCustomService = {
        domain: e.target.value,
        service: config.customService?.service || '',
        data: config.customService?.data,
      };
      onChange({ ...config, customService });
    },
    [config, onChange]
  );

  // Handle custom service name change
  const handleCustomServiceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const customService: HomeAssistantCustomService = {
        domain: config.customService?.domain || '',
        service: e.target.value,
        data: config.customService?.data,
      };
      onChange({ ...config, customService });
    },
    [config, onChange]
  );

  // Handle custom service data change
  const handleCustomDataChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setCustomDataInput(value);

      if (!value.trim()) {
        const customService: HomeAssistantCustomService = {
          domain: config.customService?.domain || '',
          service: config.customService?.service || '',
        };
        onChange({ ...config, customService });
        return;
      }

      try {
        const data = JSON.parse(value);
        const customService: HomeAssistantCustomService = {
          domain: config.customService?.domain || '',
          service: config.customService?.service || '',
          data,
        };
        onChange({ ...config, customService });
      } catch {
        // Keep invalid JSON in the input but don't update config
      }
    },
    [config, onChange]
  );

  // Quick fill entity prefix
  const handleQuickFillPrefix = useCallback(
    (prefix: string) => {
      const currentId = config.entityId || '';
      // If already has a prefix, replace it; otherwise add it
      const dotIndex = currentId.indexOf('.');
      const newId = dotIndex === -1 ? prefix : prefix + currentId.substring(dotIndex + 1);
      onChange({ ...config, entityId: newId });
    },
    [config, onChange]
  );

  const selectedOperation = config.operation || 'toggle';
  const showBrightness = selectedOperation === 'set_brightness';
  const showCustomService = selectedOperation === 'custom';

  return (
    <div className="action-form action-form--home-assistant" data-testid="home-assistant-action-form">
      {/* Operation Selection */}
      <div className="action-form__row">
        <label className="action-form__label">Operation</label>
        <select
          className="action-form__select"
          value={selectedOperation}
          onChange={handleOperationChange}
          data-testid="ha-operation-select"
        >
          {HA_OPERATIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
        <span className="action-form__hint">
          {HA_OPERATIONS.find((op) => op.value === selectedOperation)?.description}
        </span>
      </div>

      {/* Entity ID */}
      <div className="action-form__row">
        <label className="action-form__label">Entity ID</label>
        <input
          type="text"
          className="action-form__input"
          value={config.entityId || ''}
          onChange={handleEntityIdChange}
          placeholder="light.living_room"
          data-testid="ha-entity-id-input"
        />
        <div className="ha-entity-prefixes">
          <span className="ha-entity-prefixes-label">Quick prefix:</span>
          {ENTITY_PREFIXES.map((ep) => (
            <button
              key={ep.prefix}
              type="button"
              className="ha-entity-prefix-btn"
              onClick={() => handleQuickFillPrefix(ep.prefix)}
              title={`Example: ${ep.example}`}
              data-testid={`ha-prefix-${ep.prefix.replace('.', '')}`}
            >
              {ep.prefix}
            </button>
          ))}
        </div>
      </div>

      {/* Brightness (for set_brightness operation) */}
      {showBrightness && (
        <div className="action-form__row">
          <label className="action-form__label">Brightness</label>
          <div className="ha-brightness-row">
            <input
              type="range"
              className="action-form__range"
              min="0"
              max="255"
              value={config.brightness || 0}
              onChange={handleBrightnessChange}
              data-testid="ha-brightness-slider"
            />
            <input
              type="number"
              className="action-form__input action-form__input--small"
              min="0"
              max="255"
              value={config.brightness || ''}
              onChange={handleBrightnessChange}
              placeholder="128"
              data-testid="ha-brightness-input"
            />
          </div>
          <span className="action-form__hint">
            Brightness level (0 = off, 255 = max)
          </span>
        </div>
      )}

      {/* Custom Service (for custom operation) */}
      {showCustomService && (
        <>
          <div className="action-form__row">
            <label className="action-form__label">Service Domain</label>
            <input
              type="text"
              className="action-form__input"
              value={config.customService?.domain || ''}
              onChange={handleCustomDomainChange}
              placeholder="light"
              data-testid="ha-custom-domain-input"
            />
            <span className="action-form__hint">
              Service domain (e.g., light, switch, script, scene)
            </span>
          </div>

          <div className="action-form__row">
            <label className="action-form__label">Service Name</label>
            <input
              type="text"
              className="action-form__input"
              value={config.customService?.service || ''}
              onChange={handleCustomServiceChange}
              placeholder="turn_on"
              data-testid="ha-custom-service-input"
            />
            <span className="action-form__hint">
              Service name (e.g., turn_on, toggle, activate)
            </span>
          </div>

          <div className="action-form__row">
            <label className="action-form__label">Service Data (JSON)</label>
            <textarea
              className="action-form__textarea action-form__textarea--code"
              value={customDataInput}
              onChange={handleCustomDataChange}
              placeholder={'{\n  "brightness": 200,\n  "transition": 2\n}'}
              rows={4}
              spellCheck={false}
              data-testid="ha-custom-data-input"
            />
            <span className="action-form__hint">
              Optional JSON data to pass to the service
            </span>
          </div>
        </>
      )}

      {/* Integration Status Hint */}
      <div className="action-form__row action-form__row--info">
        <div className="ha-integration-hint">
          <span className="ha-integration-hint__icon">💡</span>
          <span className="ha-integration-hint__text">
            Configure Home Assistant connection in Settings → Integrations
          </span>
        </div>
      </div>
    </div>
  );
};

export default HomeAssistantActionForm;
