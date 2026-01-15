import React, { useCallback, useState } from 'react';
import type { HttpAction, HttpMethod, HttpBodyType } from '@shared/types/actions';

/** Available HTTP methods */
const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

/** Common HTTP headers */
const COMMON_HEADERS = [
  { name: 'Content-Type', value: 'application/json' },
  { name: 'Authorization', value: 'Bearer ' },
  { name: 'Accept', value: 'application/json' },
];

export interface HttpActionFormProps {
  /** Current configuration */
  config: Partial<HttpAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<HttpAction>) => void;
}

export const HttpActionForm: React.FC<HttpActionFormProps> = ({
  config,
  onChange,
}) => {
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  // Handle method change
  const handleMethodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...config, method: e.target.value as HttpMethod });
    },
    [config, onChange]
  );

  // Handle URL change
  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, url: e.target.value });
    },
    [config, onChange]
  );

  // Handle body type change
  const handleBodyTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...config, bodyType: e.target.value as HttpBodyType });
    },
    [config, onChange]
  );

  // Handle body change
  const handleBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const bodyType = config.bodyType || 'json';
      let body: string | Record<string, unknown> = e.target.value;

      // Try to parse as JSON for json body type
      if (bodyType === 'json') {
        try {
          body = JSON.parse(e.target.value);
        } catch {
          // Keep as string if invalid JSON
          body = e.target.value;
        }
      }

      onChange({ ...config, body });
    },
    [config, onChange]
  );

  // Handle timeout change
  const handleTimeoutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      onChange({ ...config, timeout: isNaN(value) ? undefined : value });
    },
    [config, onChange]
  );

  // Add header
  const handleAddHeader = useCallback(() => {
    if (newHeaderKey.trim()) {
      const headers = { ...(config.headers || {}), [newHeaderKey.trim()]: newHeaderValue };
      onChange({ ...config, headers });
      setNewHeaderKey('');
      setNewHeaderValue('');
    }
  }, [config, onChange, newHeaderKey, newHeaderValue]);

  // Remove header
  const handleRemoveHeader = useCallback(
    (key: string) => {
      const headers = { ...(config.headers || {}) };
      delete headers[key];
      onChange({ ...config, headers });
    },
    [config, onChange]
  );

  // Add common header
  const handleAddCommonHeader = useCallback(
    (name: string, value: string) => {
      const headers = { ...(config.headers || {}), [name]: value };
      onChange({ ...config, headers });
    },
    [config, onChange]
  );

  // Get body string for display
  const getBodyString = (): string => {
    if (!config.body) return '';
    if (typeof config.body === 'string') return config.body;
    return JSON.stringify(config.body, null, 2);
  };

  const showBody = config.method && config.method !== 'GET';

  return (
    <div className="action-form action-form--http" data-testid="http-action-form">
      {/* Method and URL */}
      <div className="action-form__row">
        <label className="action-form__label">Request</label>
        <div className="http-request-row">
          <select
            className="action-form__select http-method-select"
            value={config.method || 'GET'}
            onChange={handleMethodChange}
            data-testid="http-method-select"
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="action-form__input http-url-input"
            value={config.url || ''}
            onChange={handleUrlChange}
            placeholder="https://api.example.com/endpoint"
            data-testid="http-url-input"
          />
        </div>
      </div>

      {/* Headers */}
      <div className="action-form__row">
        <label className="action-form__label">Headers</label>

        {/* Existing headers */}
        {config.headers && Object.keys(config.headers).length > 0 && (
          <div className="http-headers-list">
            {Object.entries(config.headers).map(([key, value]) => (
              <div key={key} className="http-header-item">
                <span className="http-header-key">{key}:</span>
                <span className="http-header-value">{value}</span>
                <button
                  type="button"
                  className="http-header-remove"
                  onClick={() => handleRemoveHeader(key)}
                  data-testid={`remove-header-${key}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add header input */}
        <div className="http-add-header">
          <input
            type="text"
            className="action-form__input http-header-key-input"
            value={newHeaderKey}
            onChange={(e) => setNewHeaderKey(e.target.value)}
            placeholder="Header name"
            data-testid="http-header-key-input"
          />
          <input
            type="text"
            className="action-form__input http-header-value-input"
            value={newHeaderValue}
            onChange={(e) => setNewHeaderValue(e.target.value)}
            placeholder="Header value"
            data-testid="http-header-value-input"
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddHeader}
            disabled={!newHeaderKey.trim()}
            data-testid="http-add-header-btn"
          >
            Add
          </button>
        </div>

        {/* Common headers */}
        <div className="http-common-headers">
          <span className="http-common-headers-label">Quick add:</span>
          {COMMON_HEADERS.map((header) => (
            <button
              key={header.name}
              type="button"
              className="http-common-header-btn"
              onClick={() => handleAddCommonHeader(header.name, header.value)}
              data-testid={`add-common-header-${header.name.toLowerCase()}`}
            >
              {header.name}
            </button>
          ))}
        </div>
      </div>

      {/* Body (for non-GET requests) */}
      {showBody && (
        <>
          <div className="action-form__row">
            <label className="action-form__label">Body Type</label>
            <select
              className="action-form__select"
              value={config.bodyType || 'json'}
              onChange={handleBodyTypeChange}
              data-testid="http-body-type-select"
            >
              <option value="json">JSON</option>
              <option value="form">Form Data</option>
            </select>
          </div>

          <div className="action-form__row">
            <label className="action-form__label">Body</label>
            <textarea
              className="action-form__textarea action-form__textarea--code"
              value={getBodyString()}
              onChange={handleBodyChange}
              placeholder={config.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'key=value&key2=value2'}
              rows={6}
              spellCheck={false}
              data-testid="http-body-input"
            />
          </div>
        </>
      )}

      {/* Timeout */}
      <div className="action-form__row">
        <label className="action-form__label">Timeout (ms)</label>
        <input
          type="number"
          className="action-form__input action-form__input--small"
          value={config.timeout || ''}
          onChange={handleTimeoutChange}
          placeholder="10000"
          min="0"
          max="60000"
          step="1000"
          data-testid="http-timeout-input"
        />
        <span className="action-form__hint">
          Request timeout (default: 10 seconds)
        </span>
      </div>
    </div>
  );
};

export default HttpActionForm;
