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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::types::{HomeAssistantConfig, NodeRedConfig};
    use std::fs;
    use tempfile::TempDir;

    /// Create a temp directory for testing
    fn create_test_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp directory")
    }

    // ========== ConfigManager Creation Tests ==========

    #[test]
    fn test_new_creates_manager_with_defaults() {
        let temp_dir = create_test_dir();
        let manager = ConfigManager::new(temp_dir.path().to_path_buf());

        let settings = manager.get_settings();
        assert!(settings.active_profile_id.is_none());
        assert_eq!(settings.brightness, 80); // Default brightness
        assert!(!settings.start_minimized);
        assert!(!settings.auto_launch);
        assert!(settings.home_assistant.is_none());
        assert!(settings.node_red.is_none());
    }

    #[test]
    fn test_new_creates_config_directory() {
        let temp_dir = create_test_dir();
        let nested_path = temp_dir.path().join("deeply").join("nested").join("config");

        let _manager = ConfigManager::new(nested_path.clone());

        assert!(nested_path.exists());
    }

    #[test]
    fn test_new_loads_existing_config() {
        let temp_dir = create_test_dir();
        let config_path = temp_dir.path().join("config.json");

        // Create a config file with custom settings
        let custom_settings = AppSettings {
            active_profile_id: Some("my-profile".to_string()),
            brightness: 50,
            start_minimized: true,
            auto_launch: true,
            home_assistant: None,
            node_red: None,
        };
        let json = serde_json::to_string(&custom_settings).unwrap();
        fs::write(&config_path, json).unwrap();

        // Load the manager
        let manager = ConfigManager::new(temp_dir.path().to_path_buf());

        let settings = manager.get_settings();
        assert_eq!(settings.active_profile_id, Some("my-profile".to_string()));
        assert_eq!(settings.brightness, 50);
        assert!(settings.start_minimized);
        assert!(settings.auto_launch);
    }

    #[test]
    fn test_new_uses_defaults_on_invalid_config() {
        let temp_dir = create_test_dir();
        let config_path = temp_dir.path().join("config.json");

        // Write invalid JSON
        fs::write(&config_path, "{ invalid json }").unwrap();

        let manager = ConfigManager::new(temp_dir.path().to_path_buf());

        // Should use defaults since config is invalid
        let settings = manager.get_settings();
        assert_eq!(settings.brightness, 80); // Default
    }

    // ========== Settings Getter/Setter Tests ==========

    #[test]
    fn test_get_settings_returns_current() {
        let temp_dir = create_test_dir();
        let manager = ConfigManager::new(temp_dir.path().to_path_buf());

        let settings = manager.get_settings();
        assert_eq!(settings.brightness, 80);
    }

    #[test]
    fn test_set_settings_persists() {
        let temp_dir = create_test_dir();
        let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());

        let new_settings = AppSettings {
            active_profile_id: Some("profile-123".to_string()),
            brightness: 75,
            start_minimized: true,
            auto_launch: false,
            home_assistant: Some(HomeAssistantConfig {
                url: "http://ha.local:8123".to_string(),
                token: "secret-token".to_string(),
            }),
            node_red: Some(NodeRedConfig {
                url: "http://nodered.local:1880".to_string(),
            }),
        };

        manager.set_settings(new_settings.clone()).unwrap();

        // Verify in-memory
        let settings = manager.get_settings();
        assert_eq!(settings.active_profile_id, Some("profile-123".to_string()));
        assert_eq!(settings.brightness, 75);
        assert!(settings.start_minimized);

        // Verify persisted to file
        let config_path = temp_dir.path().join("config.json");
        let content = fs::read_to_string(&config_path).unwrap();
        let loaded: AppSettings = serde_json::from_str(&content).unwrap();
        assert_eq!(loaded.active_profile_id, Some("profile-123".to_string()));
        assert_eq!(loaded.brightness, 75);
    }

    // ========== Active Profile Tests ==========

    #[test]
    fn test_get_active_profile_id_when_none() {
        let temp_dir = create_test_dir();
        let manager = ConfigManager::new(temp_dir.path().to_path_buf());

        assert!(manager.get_active_profile_id().is_none());
    }

    #[test]
    fn test_set_active_profile_id() {
        let temp_dir = create_test_dir();
        let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());

        manager.set_active_profile_id(Some("profile-abc".to_string())).unwrap();

        assert_eq!(manager.get_active_profile_id(), Some("profile-abc"));
    }

    #[test]
    fn test_set_active_profile_id_to_none() {
        let temp_dir = create_test_dir();
        let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());

        // Set a profile first
        manager.set_active_profile_id(Some("profile-abc".to_string())).unwrap();
        assert!(manager.get_active_profile_id().is_some());

        // Clear it
        manager.set_active_profile_id(None).unwrap();

        assert!(manager.get_active_profile_id().is_none());
    }

    #[test]
    fn test_set_active_profile_id_persists() {
        let temp_dir = create_test_dir();

        {
            let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());
            manager.set_active_profile_id(Some("persistent-profile".to_string())).unwrap();
        }

        // Create a new manager to load from file
        let manager2 = ConfigManager::new(temp_dir.path().to_path_buf());
        assert_eq!(manager2.get_active_profile_id(), Some("persistent-profile"));
    }

    // ========== Brightness Tests ==========

    #[test]
    fn test_get_brightness_returns_default() {
        let temp_dir = create_test_dir();
        let manager = ConfigManager::new(temp_dir.path().to_path_buf());

        assert_eq!(manager.get_brightness(), 80);
    }

    #[test]
    fn test_set_brightness() {
        let temp_dir = create_test_dir();
        let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());

        manager.set_brightness(50).unwrap();

        assert_eq!(manager.get_brightness(), 50);
    }

    #[test]
    fn test_set_brightness_clamps_to_100() {
        let temp_dir = create_test_dir();
        let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());

        manager.set_brightness(150).unwrap();

        assert_eq!(manager.get_brightness(), 100);
    }

    #[test]
    fn test_set_brightness_allows_zero() {
        let temp_dir = create_test_dir();
        let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());

        manager.set_brightness(0).unwrap();

        assert_eq!(manager.get_brightness(), 0);
    }

    #[test]
    fn test_set_brightness_persists() {
        let temp_dir = create_test_dir();

        {
            let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());
            manager.set_brightness(35).unwrap();
        }

        let manager2 = ConfigManager::new(temp_dir.path().to_path_buf());
        assert_eq!(manager2.get_brightness(), 35);
    }

    // ========== Save/Load Tests ==========

    #[test]
    fn test_save_creates_file() {
        let temp_dir = create_test_dir();
        let manager = ConfigManager::new(temp_dir.path().to_path_buf());

        manager.save().unwrap();

        let config_path = temp_dir.path().join("config.json");
        assert!(config_path.exists());
    }

    #[test]
    fn test_save_writes_valid_json() {
        let temp_dir = create_test_dir();
        let manager = ConfigManager::new(temp_dir.path().to_path_buf());

        manager.save().unwrap();

        let config_path = temp_dir.path().join("config.json");
        let content = fs::read_to_string(&config_path).unwrap();
        let loaded: Result<AppSettings, _> = serde_json::from_str(&content);
        assert!(loaded.is_ok());
    }

    #[test]
    fn test_round_trip_preserves_all_fields() {
        let temp_dir = create_test_dir();
        let mut manager = ConfigManager::new(temp_dir.path().to_path_buf());

        let settings = AppSettings {
            active_profile_id: Some("round-trip-profile".to_string()),
            brightness: 42,
            start_minimized: true,
            auto_launch: true,
            home_assistant: Some(HomeAssistantConfig {
                url: "http://homeassistant.local:8123".to_string(),
                token: "super-secret-token".to_string(),
            }),
            node_red: Some(NodeRedConfig {
                url: "http://nodered.local:1880".to_string(),
            }),
        };

        manager.set_settings(settings).unwrap();

        // Create new manager to load from disk
        let manager2 = ConfigManager::new(temp_dir.path().to_path_buf());
        let loaded = manager2.get_settings();

        assert_eq!(loaded.active_profile_id, Some("round-trip-profile".to_string()));
        assert_eq!(loaded.brightness, 42);
        assert!(loaded.start_minimized);
        assert!(loaded.auto_launch);

        let ha = loaded.home_assistant.as_ref().unwrap();
        assert_eq!(ha.url, "http://homeassistant.local:8123");
        assert_eq!(ha.token, "super-secret-token");

        let nr = loaded.node_red.as_ref().unwrap();
        assert_eq!(nr.url, "http://nodered.local:1880");
    }

    // ========== AppSettings Default Tests ==========

    #[test]
    fn test_app_settings_default() {
        let defaults = AppSettings::default();

        assert!(defaults.active_profile_id.is_none());
        assert_eq!(defaults.brightness, 80);
        assert!(!defaults.start_minimized);
        assert!(!defaults.auto_launch);
        assert!(defaults.home_assistant.is_none());
        assert!(defaults.node_red.is_none());
    }

    // ========== Serialization Tests ==========

    #[test]
    fn test_settings_serialize_to_camel_case() {
        let settings = AppSettings {
            active_profile_id: Some("test".to_string()),
            brightness: 80,
            start_minimized: true,
            auto_launch: false,
            home_assistant: None,
            node_red: None,
        };

        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("\"activeProfileId\""));
        assert!(json.contains("\"startMinimized\""));
        assert!(json.contains("\"autoLaunch\""));
        assert!(!json.contains("\"active_profile_id\"")); // Should be camelCase
    }

    #[test]
    fn test_home_assistant_config_serializes() {
        let config = HomeAssistantConfig {
            url: "http://ha.local".to_string(),
            token: "secret".to_string(),
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"url\":\"http://ha.local\""));
        assert!(json.contains("\"token\":\"secret\""));
    }

    #[test]
    fn test_node_red_config_serializes() {
        let config = NodeRedConfig {
            url: "http://nodered.local".to_string(),
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"url\":\"http://nodered.local\""));
    }
}
