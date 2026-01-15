/**
 * AppSettings Component
 * Application behavior settings: startup, theme, tray, language
 */

import React, { useState, useEffect } from 'react';
import type { AppSettings as AppSettingsType, ThemeMode, Language } from '@shared/types/config';

export interface AppSettingsProps {
  appSettings: AppSettingsType | null;
  onSettingsChange: (settings: AppSettingsType) => Promise<void>;
  isLoading: boolean;
}

// Get the electron API from window
const getAutoLaunchAPI = () => window.electronAPI?.autoLaunch;

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: '💻' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
];

export const AppSettings: React.FC<AppSettingsProps> = ({
  appSettings,
  onSettingsChange,
  isLoading,
}) => {
  // Local state for immediate UI updates
  const [launchOnStartup, setLaunchOnStartup] = useState(appSettings?.launchOnStartup ?? false);
  const [minimizeToTray, setMinimizeToTray] = useState(appSettings?.minimizeToTray ?? true);
  const [closeToTray, setCloseToTray] = useState(appSettings?.closeToTray ?? true);
  const [theme, setTheme] = useState<ThemeMode>(appSettings?.theme ?? 'system');
  const [language, setLanguage] = useState<Language>(appSettings?.language ?? 'en');
  const [autoLaunchError, setAutoLaunchError] = useState<string | null>(null);
  const [isSettingAutoLaunch, setIsSettingAutoLaunch] = useState(false);

  // Fetch actual auto-launch status from system on mount
  useEffect(() => {
    const fetchAutoLaunchStatus = async () => {
      const api = getAutoLaunchAPI();
      if (!api) return;

      try {
        const status = await api.getStatus();
        setLaunchOnStartup(status.enabled);
        if (status.error) {
          setAutoLaunchError(status.error);
        }
      } catch (error) {
        console.error('Failed to fetch auto-launch status:', error);
      }
    };

    fetchAutoLaunchStatus();
  }, []);

  // Sync local state with props (except launchOnStartup which comes from system)
  useEffect(() => {
    if (appSettings) {
      // Don't override launchOnStartup - it's managed by the system auto-launch API
      setMinimizeToTray(appSettings.minimizeToTray);
      setCloseToTray(appSettings.closeToTray);
      setTheme(appSettings.theme);
      setLanguage(appSettings.language);
    }
  }, [appSettings]);

  // Helper to update a single setting
  const updateSetting = <K extends keyof AppSettingsType>(
    key: K,
    value: AppSettingsType[K]
  ) => {
    if (appSettings) {
      onSettingsChange({
        ...appSettings,
        [key]: value,
      });
    }
  };

  // Handle launch on startup toggle - uses system auto-launch API
  const handleLaunchOnStartupChange = async (enabled: boolean) => {
    const api = getAutoLaunchAPI();
    if (!api) {
      setAutoLaunchError('Auto-launch API not available');
      return;
    }

    setIsSettingAutoLaunch(true);
    setAutoLaunchError(null);

    try {
      // Call the system auto-launch API
      await api.setEnabled(enabled, minimizeToTray);
      setLaunchOnStartup(enabled);
      // The IPC handler also updates the config, so we don't need to call updateSetting
    } catch (error) {
      console.error('Failed to set auto-launch:', error);
      setAutoLaunchError(error instanceof Error ? error.message : 'Failed to set auto-launch');
      // Revert the UI state
      setLaunchOnStartup(!enabled);
    } finally {
      setIsSettingAutoLaunch(false);
    }
  };

  // Handle minimize to tray toggle
  const handleMinimizeToTrayChange = (enabled: boolean) => {
    setMinimizeToTray(enabled);
    updateSetting('minimizeToTray', enabled);
  };

  // Handle close to tray toggle
  const handleCloseToTrayChange = (enabled: boolean) => {
    setCloseToTray(enabled);
    updateSetting('closeToTray', enabled);
  };

  // Handle theme change
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    updateSetting('theme', newTheme);
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    updateSetting('language', newLanguage);
  };

  if (isLoading) {
    return (
      <div className="settings-section">
        <p className="text-text-muted italic">Loading application settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-section" data-testid="app-settings-content">
      {/* Startup Settings */}
      <div className="settings-group">
        <h3 className="settings-group__title">Startup</h3>

        <div className="settings-field">
          <div className="settings-field__row">
            <label className="settings-field__label" htmlFor="launch-startup">
              Launch on Startup
              {isSettingAutoLaunch && <span className="settings-spinner" />}
            </label>
            <label className="settings-toggle">
              <input
                id="launch-startup"
                type="checkbox"
                checked={launchOnStartup}
                onChange={(e) => handleLaunchOnStartupChange(e.target.checked)}
                className="settings-toggle__input"
                disabled={isSettingAutoLaunch}
              />
              <span className="settings-toggle__slider"></span>
            </label>
          </div>
          <p className="settings-field__hint">
            Automatically start SOOMFON Controller when you log in.
          </p>
          {autoLaunchError && (
            <p className="settings-field__error">
              {autoLaunchError}
            </p>
          )}
        </div>
      </div>

      {/* System Tray Settings */}
      <div className="settings-group">
        <h3 className="settings-group__title">System Tray</h3>

        <div className="settings-field">
          <div className="settings-field__row">
            <label className="settings-field__label" htmlFor="minimize-tray">
              Minimize to Tray
            </label>
            <label className="settings-toggle">
              <input
                id="minimize-tray"
                type="checkbox"
                checked={minimizeToTray}
                onChange={(e) => handleMinimizeToTrayChange(e.target.checked)}
                className="settings-toggle__input"
              />
              <span className="settings-toggle__slider"></span>
            </label>
          </div>
          <p className="settings-field__hint">
            Minimize the window to the system tray instead of the taskbar.
          </p>
        </div>

        <div className="settings-field">
          <div className="settings-field__row">
            <label className="settings-field__label" htmlFor="close-tray">
              Close to Tray
            </label>
            <label className="settings-toggle">
              <input
                id="close-tray"
                type="checkbox"
                checked={closeToTray}
                onChange={(e) => handleCloseToTrayChange(e.target.checked)}
                className="settings-toggle__input"
              />
              <span className="settings-toggle__slider"></span>
            </label>
          </div>
          <p className="settings-field__hint">
            When closing the window, minimize to tray instead of exiting.
          </p>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="settings-group">
        <h3 className="settings-group__title">Appearance</h3>

        <div className="settings-field">
          <div className="settings-field__row">
            <label className="settings-field__label">Theme</label>
          </div>
          <div className="settings-theme-selector">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`settings-theme-btn ${
                  theme === option.value ? 'settings-theme-btn--active' : ''
                }`}
                onClick={() => handleThemeChange(option.value)}
              >
                <span className="settings-theme-btn__icon">{option.icon}</span>
                <span className="settings-theme-btn__label">{option.label}</span>
              </button>
            ))}
          </div>
          <p className="settings-field__hint">
            Choose your preferred color theme.
          </p>
        </div>
      </div>

      {/* Language Settings */}
      <div className="settings-group">
        <h3 className="settings-group__title">Language</h3>

        <div className="settings-field">
          <div className="settings-field__row">
            <label className="settings-field__label" htmlFor="language-select">
              Interface Language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              className="settings-select"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="settings-field__hint">
            Select the language for the user interface.
          </p>
        </div>
      </div>

      {/* Data Directory (Read-only info) */}
      <div className="settings-group">
        <h3 className="settings-group__title">Data</h3>

        <div className="settings-field">
          <div className="settings-field__row">
            <span className="settings-field__label">Data Directory</span>
            <span className="settings-field__value settings-field__value--path">
              %APPDATA%/soomfon-controller
            </span>
          </div>
          <p className="settings-field__hint">
            Configuration files and profiles are stored in this location.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
