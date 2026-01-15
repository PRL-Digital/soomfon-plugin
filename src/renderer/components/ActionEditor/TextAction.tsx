import React, { useCallback } from 'react';
import type { TextAction } from '@shared/types/actions';

export interface TextActionFormProps {
  /** Current configuration */
  config: Partial<TextAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<TextAction>) => void;
}

export const TextActionForm: React.FC<TextActionFormProps> = ({
  config,
  onChange,
}) => {
  // Handle text change
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...config, text: e.target.value });
    },
    [config, onChange]
  );

  // Handle type delay change
  const handleTypeDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      onChange({ ...config, typeDelay: isNaN(value) ? undefined : Math.max(0, value) });
    },
    [config, onChange]
  );

  return (
    <div className="action-form action-form--text" data-testid="text-action-form">
      <div className="action-form__row">
        <label className="action-form__label">Text to Type</label>
        <textarea
          className="action-form__textarea"
          value={config.text || ''}
          onChange={handleTextChange}
          placeholder="Enter text to type..."
          rows={4}
          data-testid="text-input"
        />
        <span className="action-form__hint">
          Text that will be typed when this action is triggered
        </span>
      </div>

      <div className="action-form__row">
        <label className="action-form__label">Type Delay (ms)</label>
        <input
          type="number"
          className="action-form__input action-form__input--small"
          value={config.typeDelay ?? ''}
          onChange={handleTypeDelayChange}
          placeholder="0"
          min="0"
          max="1000"
          step="10"
          data-testid="type-delay-input"
        />
        <span className="action-form__hint">
          Delay between each character in milliseconds (0 = instant)
        </span>
      </div>
    </div>
  );
};

export default TextActionForm;
