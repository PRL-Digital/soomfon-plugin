//! Config Manager
//!
//! Manages application settings persistence.

use super::types::AppSettings;
use std::fs;
use std::path::PathBuf;

/// Manages application configuration
pub struct ConfigManager {
    /// Path to config file
    config_path: PathBuf,
    /// Current settings
    settings: AppSettings,
}

impl ConfigManager {
    /// Create a new config manager
    pub fn new(app_data_dir: PathBuf) -> Self {
        let config_path = app_data_dir.join("config.json");

        // Ensure directory exists
        if let Some(parent) = config_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        // Load existing settings or use defaults
        let settings = Self::load_from_file(&config_path).unwrap_or_default();

        Self {
            config_path,
            settings,
        }
    }

    /// Get current app settings
    pub fn get_settings(&self) -> &AppSettings {
        &self.settings
    }

    /// Update app settings
    pub fn set_settings(&mut self, settings: AppSettings) -> Result<(), String> {
        self.settings = settings;
        self.save()
    }

    /// Save settings to file
    pub fn save(&self) -> Result<(), String> {
        let json = serde_json::to_string_pretty(&self.settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        fs::write(&self.config_path, json)
            .map_err(|e| format!("Failed to write config file: {}", e))?;

        Ok(())
    }

    /// Load settings from file
    fn load_from_file(path: &PathBuf) -> Option<AppSettings> {
        let content = fs::read_to_string(path).ok()?;
        serde_json::from_str(&content).ok()
    }

    /// Get active profile ID
    pub fn get_active_profile_id(&self) -> Option<&str> {
        self.settings.active_profile_id.as_deref()
    }

    /// Set active profile ID
    pub fn set_active_profile_id(&mut self, id: Option<String>) -> Result<(), String> {
        self.settings.active_profile_id = id;
        self.save()
    }

    /// Get brightness level
    pub fn get_brightness(&self) -> u8 {
        self.settings.brightness
    }

    /// Set brightness level
    pub fn set_brightness(&mut self, level: u8) -> Result<(), String> {
        self.settings.brightness = level.min(100);
        self.save()
    }
}
