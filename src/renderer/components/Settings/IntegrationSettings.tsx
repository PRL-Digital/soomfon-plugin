/**
 * IntegrationSettings Component
 * External service integrations: Home Assistant, Node-RED
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { IntegrationSettings as IntegrationSettingsType } from '@shared/types/config';

export interface IntegrationSettingsProps {
  integrations: IntegrationSettingsType | null;
  onSettingsChange: (settings: IntegrationSettingsType) => Promise<void>;
  isLoading: boolean;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  integrations,
  onSettingsChange,
  isLoading,
}) => {
  // Home Assistant state
  const [haEnabled, setHaEnabled] = useState(integrations?.homeAssistant.enabled ?? false);
  const [haUrl, setHaUrl] = useState(integrations?.homeAssistant.url ?? '');
  const [haToken, setHaToken] = useState(integrations?.homeAssistant.accessToken ?? '');
  const [haTestStatus, setHaTestStatus] = useState<TestStatus>('idle');
  const [haTestMessage, setHaTestMessage] = useState('');

  // Node-RED state
  const [nrEnabled, setNrEnabled] = useState(integrations?.nodeRed.enabled ?? false);
  const [nrUrl, setNrUrl] = useState(integrations?.nodeRed.url ?? '');
  const [nrUsername, setNrUsername] = useState(integrations?.nodeRed.username ?? '');
  const [nrPassword, setNrPassword] = useState(integrations?.nodeRed.password ?? '');
  const [nrTestStatus, setNrTestStatus] = useState<TestStatus>('idle');
  const [nrTestMessage, setNrTestMessage] = useState('');

  // Sync local state with props
  useEffect(() => {
    if (integrations) {
      setHaEnabled(integrations.homeAssistant.enabled);
      setHaUrl(integrations.homeAssistant.url ?? '');
      setHaToken(integrations.homeAssistant.accessToken ?? '');
      setNrEnabled(integrations.nodeRed.enabled);
      setNrUrl(integrations.nodeRed.url ?? '');
      setNrUsername(integrations.nodeRed.username ?? '');
      setNrPassword(integrations.nodeRed.password ?? '');
    }
  }, [integrations]);

  // Helper to update settings
  const updateSettings = useCallback((
    updates: Partial<IntegrationSettingsType>
  ) => {
    if (integrations) {
      onSettingsChange({
        ...integrations,
        ...updates,
      });
    }
  }, [integrations, onSettingsChange]);

  // Home Assistant handlers
  const handleHaEnabledChange = (enabled: boolean) => {
    setHaEnabled(enabled);
    updateSettings({
      homeAssistant: {
        ...integrations?.homeAssistant,
        enabled,
        url: haUrl || undefined,
        accessToken: haToken || undefined,
      },
    });
  };

  const handleHaUrlChange = (url: string) => {
    setHaUrl(url);
  };

  const handleHaTokenChange = (token: string) => {
    setHaToken(token);
  };

  const handleHaBlur = () => {
    updateSettings({
      homeAssistant: {
        enabled: haEnabled,
        url: haUrl || undefined,
        accessToken: haToken || undefined,
      },
    });
  };

  const handleHaTest = async () => {
    if (!haUrl) {
      setHaTestStatus('error');
      setHaTestMessage('Please enter a server URL');
      return;
    }

    setHaTestStatus('testing');
    setHaTestMessage('');

    try {
      // Try to fetch Home Assistant API
      const response = await fetch(`${haUrl}/api/`, {
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHaTestStatus('success');
        setHaTestMessage(`Connected to Home Assistant ${data.version || ''}`);
      } else if (response.status === 401) {
        setHaTestStatus('error');
        setHaTestMessage('Authentication failed. Check your access token.');
      } else {
        setHaTestStatus('error');
        setHaTestMessage(`Server returned ${response.status}`);
      }
    } catch (err) {
      setHaTestStatus('error');
      setHaTestMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  // Node-RED handlers
  const handleNrEnabledChange = (enabled: boolean) => {
    setNrEnabled(enabled);
    updateSettings({
      nodeRed: {
        ...integrations?.nodeRed,
        enabled,
        url: nrUrl || undefined,
        username: nrUsername || undefined,
        password: nrPassword || undefined,
      },
    });
  };

  const handleNrUrlChange = (url: string) => {
    setNrUrl(url);
  };

  const handleNrUsernameChange = (username: string) => {
    setNrUsername(username);
  };

  const handleNrPasswordChange = (password: string) => {
    setNrPassword(password);
  };

  const handleNrBlur = () => {
    updateSettings({
      nodeRed: {
        enabled: nrEnabled,
        url: nrUrl || undefined,
        username: nrUsername || undefined,
        password: nrPassword || undefined,
      },
    });
  };

  const handleNrTest = async () => {
    if (!nrUrl) {
      setNrTestStatus('error');
      setNrTestMessage('Please enter a server URL');
      return;
    }

    setNrTestStatus('testing');
    setNrTestMessage('');

    try {
      // Try to fetch Node-RED settings endpoint
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (nrUsername && nrPassword) {
        headers.Authorization = `Basic ${btoa(`${nrUsername}:${nrPassword}`)}`;
      }

      const response = await fetch(`${nrUrl}/settings`, { headers });

      if (response.ok) {
        const data = await response.json();
        setNrTestStatus('success');
        setNrTestMessage(`Connected to Node-RED ${data.version || ''}`);
      } else if (response.status === 401) {
        setNrTestStatus('error');
        setNrTestMessage('Authentication failed. Check your credentials.');
      } else {
        setNrTestStatus('error');
        setNrTestMessage(`Server returned ${response.status}`);
      }
    } catch (err) {
      setNrTestStatus('error');
      setNrTestMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  if (isLoading) {
    return (
      <div className="settings-section">
        <p className="text-text-muted italic">Loading integration settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-section" data-testid="integration-settings-content">
      {/* Home Assistant */}
      <div className="settings-group settings-integration">
        <div className="settings-integration__header">
          <div className="settings-integration__info">
            <h3 className="settings-group__title">
              <span className="settings-integration__icon">🏠</span>
              Home Assistant
            </h3>
            <p className="settings-integration__description">
              Control smart home devices and trigger automations.
            </p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={haEnabled}
              onChange={(e) => handleHaEnabledChange(e.target.checked)}
              className="settings-toggle__input"
            />
            <span className="settings-toggle__slider"></span>
          </label>
        </div>

        {haEnabled && (
          <div className="settings-integration__content">
            <div className="settings-field">
              <label className="settings-field__label" htmlFor="ha-url">
                Server URL
              </label>
              <input
                id="ha-url"
                type="text"
                value={haUrl}
                onChange={(e) => handleHaUrlChange(e.target.value)}
                onBlur={handleHaBlur}
                placeholder="http://homeassistant.local:8123"
                className="settings-input"
              />
            </div>

            <div className="settings-field">
              <label className="settings-field__label" htmlFor="ha-token">
                Access Token
              </label>
              <input
                id="ha-token"
                type="password"
                value={haToken}
                onChange={(e) => handleHaTokenChange(e.target.value)}
                onBlur={handleHaBlur}
                placeholder="Long-lived access token"
                className="settings-input"
              />
              <p className="settings-field__hint">
                Create a long-lived access token in Home Assistant → Profile → Long-Lived Access Tokens.
              </p>
            </div>

            <div className="settings-integration__test">
              <button
                className="btn btn-secondary"
                onClick={handleHaTest}
                disabled={haTestStatus === 'testing'}
              >
                {haTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
              {haTestStatus !== 'idle' && haTestStatus !== 'testing' && (
                <span className={`settings-test-result settings-test-result--${haTestStatus}`}>
                  {haTestStatus === 'success' ? '✓' : '✗'} {haTestMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Node-RED */}
      <div className="settings-group settings-integration">
        <div className="settings-integration__header">
          <div className="settings-integration__info">
            <h3 className="settings-group__title">
              <span className="settings-integration__icon">🔴</span>
              Node-RED
            </h3>
            <p className="settings-integration__description">
              Send events and trigger flows via webhooks.
            </p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={nrEnabled}
              onChange={(e) => handleNrEnabledChange(e.target.checked)}
              className="settings-toggle__input"
            />
            <span className="settings-toggle__slider"></span>
          </label>
        </div>

        {nrEnabled && (
          <div className="settings-integration__content">
            <div className="settings-field">
              <label className="settings-field__label" htmlFor="nr-url">
                Server URL
              </label>
              <input
                id="nr-url"
                type="text"
                value={nrUrl}
                onChange={(e) => handleNrUrlChange(e.target.value)}
                onBlur={handleNrBlur}
                placeholder="http://localhost:1880"
                className="settings-input"
              />
            </div>

            <div className="settings-field">
              <label className="settings-field__label" htmlFor="nr-username">
                Username (optional)
              </label>
              <input
                id="nr-username"
                type="text"
                value={nrUsername}
                onChange={(e) => handleNrUsernameChange(e.target.value)}
                onBlur={handleNrBlur}
                placeholder="admin"
                className="settings-input"
              />
            </div>

            <div className="settings-field">
              <label className="settings-field__label" htmlFor="nr-password">
                Password (optional)
              </label>
              <input
                id="nr-password"
                type="password"
                value={nrPassword}
                onChange={(e) => handleNrPasswordChange(e.target.value)}
                onBlur={handleNrBlur}
                placeholder="Password"
                className="settings-input"
              />
              <p className="settings-field__hint">
                Only required if Node-RED has authentication enabled.
              </p>
            </div>

            <div className="settings-integration__test">
              <button
                className="btn btn-secondary"
                onClick={handleNrTest}
                disabled={nrTestStatus === 'testing'}
              >
                {nrTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
              {nrTestStatus !== 'idle' && nrTestStatus !== 'testing' && (
                <span className={`settings-test-result settings-test-result--${nrTestStatus}`}>
                  {nrTestStatus === 'success' ? '✓' : '✗'} {nrTestMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationSettings;
