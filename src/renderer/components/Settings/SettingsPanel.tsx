/**
 * SettingsPanel Component
 * Tabbed settings panel with Device, App, and Integration sub-tabs
 */

import React, { useState } from 'react';
import { DeviceSettings } from './DeviceSettings';
import { AppSettings } from './AppSettings';
import { IntegrationSettings } from './IntegrationSettings';
import type { UseConfigReturn } from '../../hooks/useConfig';
import type { ConnectionState } from '@shared/types/device';

export type SettingsTabId = 'device' | 'app' | 'integrations';

export interface SettingsPanelProps {
  config: UseConfigReturn;
  connectionState?: ConnectionState;
  onBrightnessChange?: (brightness: number) => void;
}

interface TabButtonProps {
  id: SettingsTabId;
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ id, label, icon, isActive, onClick }) => (
  <button
    data-testid={`${id}-settings-tab`}
    className={`settings-tab-btn ${isActive ? 'settings-tab-btn--active' : ''}`}
    onClick={onClick}
  >
    <span className="settings-tab-btn__icon">{icon}</span>
    <span className="settings-tab-btn__label">{label}</span>
  </button>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  connectionState,
  onBrightnessChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('device');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Show save indicator briefly when settings change
  const handleSettingsSaved = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const tabs: { id: SettingsTabId; label: string; icon: string }[] = [
    { id: 'device', label: 'Device', icon: '🎛️' },
    { id: 'app', label: 'Application', icon: '⚙️' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
  ];

  return (
    <div className="settings-panel" data-testid="settings-panel">
      {/* Settings Tab Navigation */}
      <div className="settings-panel__tabs">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}

        {/* Save Status Indicator */}
        {saveStatus !== 'idle' && (
          <span className={`settings-panel__save-status settings-panel__save-status--${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>
        )}
      </div>

      {/* Settings Content */}
      <div className="settings-panel__content">
        {activeTab === 'device' && (
          <DeviceSettings
            deviceSettings={config.deviceSettings}
            connectionState={connectionState}
            onSettingsChange={async (settings) => {
              setSaveStatus('saving');
              await config.setDeviceSettings(settings);
              handleSettingsSaved();
            }}
            onBrightnessChange={onBrightnessChange}
            isLoading={config.isLoading}
          />
        )}

        {activeTab === 'app' && (
          <AppSettings
            appSettings={config.appSettings}
            onSettingsChange={async (settings) => {
              setSaveStatus('saving');
              await config.setAppSettings(settings);
              handleSettingsSaved();
            }}
            isLoading={config.isLoading}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationSettings
            integrations={config.integrations}
            onSettingsChange={async (settings) => {
              setSaveStatus('saving');
              await config.setIntegrations(settings);
              handleSettingsSaved();
            }}
            isLoading={config.isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
