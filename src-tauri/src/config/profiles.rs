//! Profile Manager
//!
//! Manages device profiles (CRUD operations, import/export).

use super::types::{Profile, ProfileUpdate};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Manages device profiles
pub struct ProfileManager {
    /// Directory containing profile files
    profiles_dir: PathBuf,
    /// Cached profiles (id -> profile)
    profiles: HashMap<String, Profile>,
}

impl ProfileManager {
    /// Create a new profile manager
    pub fn new(profiles_dir: PathBuf) -> Self {
        // Ensure directory exists
        let _ = fs::create_dir_all(&profiles_dir);

        let mut manager = Self {
            profiles_dir,
            profiles: HashMap::new(),
        };

        // Load existing profiles
        manager.load_all();

        manager
    }

    /// Load all profiles from disk
    fn load_all(&mut self) {
        self.profiles.clear();

        let entries = match fs::read_dir(&self.profiles_dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                if let Some(profile) = Self::load_profile_from_file(&path) {
                    self.profiles.insert(profile.id.clone(), profile);
                }
            }
        }
    }

    /// Load a single profile from file
    fn load_profile_from_file(path: &PathBuf) -> Option<Profile> {
        let content = fs::read_to_string(path).ok()?;
        serde_json::from_str(&content).ok()
    }

    /// Save a profile to disk
    fn save_profile(&self, profile: &Profile) -> Result<(), String> {
        let path = self.profiles_dir.join(format!("{}.json", profile.id));
        let json = serde_json::to_string_pretty(profile)
            .map_err(|e| format!("Failed to serialize profile: {}", e))?;

        fs::write(&path, json)
            .map_err(|e| format!("Failed to write profile file: {}", e))?;

        Ok(())
    }

    /// List all profiles
    pub fn list(&self) -> Vec<&Profile> {
        self.profiles.values().collect()
    }

    /// Get a profile by ID
    pub fn get(&self, id: &str) -> Option<&Profile> {
        self.profiles.get(id)
    }

    /// Create a new profile
    pub fn create(&mut self, name: String) -> Result<Profile, String> {
        let profile = Profile::new(name);

        self.save_profile(&profile)?;
        self.profiles.insert(profile.id.clone(), profile.clone());

        Ok(profile)
    }

    /// Update an existing profile
    pub fn update(&mut self, id: &str, update: ProfileUpdate) -> Result<Profile, String> {
        let profile = self.profiles.get_mut(id)
            .ok_or_else(|| format!("Profile not found: {}", id))?;

        if let Some(name) = update.name {
            profile.name = name;
        }
        if let Some(description) = update.description {
            profile.description = Some(description);
        }
        if let Some(buttons) = update.buttons {
            profile.buttons = buttons;
        }
        if let Some(encoders) = update.encoders {
            profile.encoders = encoders;
        }

        profile.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let profile = profile.clone();
        self.save_profile(&profile)?;

        Ok(profile)
    }

    /// Delete a profile
    pub fn delete(&mut self, id: &str) -> Result<(), String> {
        let path = self.profiles_dir.join(format!("{}.json", id));

        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to delete profile file: {}", e))?;
        }

        self.profiles.remove(id);
        Ok(())
    }

    /// Import a profile from JSON string
    pub fn import(&mut self, json: &str) -> Result<Profile, String> {
        let mut profile: Profile = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse profile JSON: {}", e))?;

        // Generate new ID to avoid conflicts
        profile.id = uuid::Uuid::new_v4().to_string();
        profile.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        self.save_profile(&profile)?;
        self.profiles.insert(profile.id.clone(), profile.clone());

        Ok(profile)
    }

    /// Export a profile to JSON string
    pub fn export(&self, id: &str) -> Result<String, String> {
        let profile = self.profiles.get(id)
            .ok_or_else(|| format!("Profile not found: {}", id))?;

        serde_json::to_string_pretty(profile)
            .map_err(|e| format!("Failed to serialize profile: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::types::{ButtonConfig, EncoderConfig};
    use crate::actions::types::{Action, MediaAction, MediaActionType, KeyboardAction};
    use tempfile::TempDir;

    /// Create a temp directory for testing
    fn create_test_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp directory")
    }

    /// Create a profile with some button/encoder configs for testing
    fn create_profile_with_actions(name: &str) -> Profile {
        let mut profile = Profile::new(name.to_string());

        // Add an action to button 0
        profile.buttons = vec![ButtonConfig {
            index: 0,
            label: Some("Volume".to_string()),
            image: None,
            action: Some(Action::Media(MediaAction {
                action: MediaActionType::VolumeUp,
            })),
            long_press_action: None,
        }];

        // Add an action to encoder 0
        profile.encoders = vec![EncoderConfig {
            index: 0,
            label: Some("Brightness".to_string()),
            press_action: None,
            long_press_action: None,
            clockwise_action: Some(Action::Keyboard(KeyboardAction {
                key: "Up".to_string(),
                modifiers: vec![],
            })),
            counter_clockwise_action: None,
        }];

        profile
    }

    // ========== ProfileManager Creation Tests ==========

    #[test]
    fn test_new_creates_manager_with_empty_profiles() {
        let temp_dir = create_test_dir();
        let manager = ProfileManager::new(temp_dir.path().to_path_buf());

        assert!(manager.list().is_empty());
    }

    #[test]
    fn test_new_creates_profiles_directory() {
        let temp_dir = create_test_dir();
        let profiles_path = temp_dir.path().join("profiles").join("nested");

        let _manager = ProfileManager::new(profiles_path.clone());

        assert!(profiles_path.exists());
    }

    #[test]
    fn test_new_loads_existing_profiles() {
        let temp_dir = create_test_dir();

        // Create some profile files
        let profile1 = Profile::new("Profile One".to_string());
        let profile2 = Profile::new("Profile Two".to_string());

        let json1 = serde_json::to_string(&profile1).unwrap();
        let json2 = serde_json::to_string(&profile2).unwrap();

        fs::write(temp_dir.path().join(format!("{}.json", profile1.id)), json1).unwrap();
        fs::write(temp_dir.path().join(format!("{}.json", profile2.id)), json2).unwrap();

        // Load the manager
        let manager = ProfileManager::new(temp_dir.path().to_path_buf());

        assert_eq!(manager.list().len(), 2);
    }

    #[test]
    fn test_new_ignores_invalid_json_files() {
        let temp_dir = create_test_dir();

        // Create valid profile
        let profile = Profile::new("Valid".to_string());
        let json = serde_json::to_string(&profile).unwrap();
        fs::write(temp_dir.path().join(format!("{}.json", profile.id)), json).unwrap();

        // Create invalid JSON file
        fs::write(temp_dir.path().join("invalid.json"), "{ not valid json }").unwrap();

        let manager = ProfileManager::new(temp_dir.path().to_path_buf());

        // Should only load the valid profile
        assert_eq!(manager.list().len(), 1);
    }

    #[test]
    fn test_new_ignores_non_json_files() {
        let temp_dir = create_test_dir();

        // Create valid profile
        let profile = Profile::new("Valid".to_string());
        let json = serde_json::to_string(&profile).unwrap();
        fs::write(temp_dir.path().join(format!("{}.json", profile.id)), json).unwrap();

        // Create non-JSON file
        fs::write(temp_dir.path().join("readme.txt"), "This is a text file").unwrap();

        let manager = ProfileManager::new(temp_dir.path().to_path_buf());

        assert_eq!(manager.list().len(), 1);
    }

    // ========== List Tests ==========

    #[test]
    fn test_list_returns_all_profiles() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        manager.create("Profile A".to_string()).unwrap();
        manager.create("Profile B".to_string()).unwrap();
        manager.create("Profile C".to_string()).unwrap();

        assert_eq!(manager.list().len(), 3);
    }

    #[test]
    fn test_list_returns_empty_for_new_manager() {
        let temp_dir = create_test_dir();
        let manager = ProfileManager::new(temp_dir.path().to_path_buf());

        assert!(manager.list().is_empty());
    }

    // ========== Get Tests ==========

    #[test]
    fn test_get_returns_profile_by_id() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let created = manager.create("My Profile".to_string()).unwrap();
        let retrieved = manager.get(&created.id).unwrap();

        assert_eq!(retrieved.name, "My Profile");
        assert_eq!(retrieved.id, created.id);
    }

    #[test]
    fn test_get_returns_none_for_unknown_id() {
        let temp_dir = create_test_dir();
        let manager = ProfileManager::new(temp_dir.path().to_path_buf());

        assert!(manager.get("nonexistent-id").is_none());
    }

    // ========== Create Tests ==========

    #[test]
    fn test_create_returns_new_profile() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("New Profile".to_string()).unwrap();

        assert_eq!(profile.name, "New Profile");
        assert!(!profile.id.is_empty());
        assert!(profile.created_at > 0);
        assert!(profile.updated_at > 0);
    }

    #[test]
    fn test_create_adds_to_cache() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Cached Profile".to_string()).unwrap();

        assert!(manager.get(&profile.id).is_some());
    }

    #[test]
    fn test_create_saves_to_disk() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Disk Profile".to_string()).unwrap();

        let file_path = temp_dir.path().join(format!("{}.json", profile.id));
        assert!(file_path.exists());

        // Verify content
        let content = fs::read_to_string(&file_path).unwrap();
        let loaded: Profile = serde_json::from_str(&content).unwrap();
        assert_eq!(loaded.name, "Disk Profile");
    }

    #[test]
    fn test_create_initializes_buttons_and_encoders() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Button Profile".to_string()).unwrap();

        // New profiles start with empty sparse arrays
        assert!(profile.buttons.is_empty());
        assert!(profile.encoders.is_empty());
    }

    #[test]
    fn test_create_generates_unique_ids() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile1 = manager.create("Profile 1".to_string()).unwrap();
        let profile2 = manager.create("Profile 2".to_string()).unwrap();

        assert_ne!(profile1.id, profile2.id);
    }

    // ========== Update Tests ==========

    #[test]
    fn test_update_changes_name() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Original Name".to_string()).unwrap();

        let update = ProfileUpdate {
            name: Some("Updated Name".to_string()),
            description: None,
            buttons: None,
            encoders: None,
        };

        let updated = manager.update(&profile.id, update).unwrap();

        assert_eq!(updated.name, "Updated Name");
    }

    #[test]
    fn test_update_changes_description() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Profile".to_string()).unwrap();

        let update = ProfileUpdate {
            name: None,
            description: Some("New description".to_string()),
            buttons: None,
            encoders: None,
        };

        let updated = manager.update(&profile.id, update).unwrap();

        assert_eq!(updated.description, Some("New description".to_string()));
    }

    #[test]
    fn test_update_changes_buttons() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Profile".to_string()).unwrap();

        let new_buttons = vec![ButtonConfig {
            index: 0,
            label: Some("Custom Label".to_string()),
            image: None,
            action: None,
            long_press_action: None,
        }];

        let update = ProfileUpdate {
            name: None,
            description: None,
            buttons: Some(new_buttons),
            encoders: None,
        };

        let updated = manager.update(&profile.id, update).unwrap();

        assert_eq!(updated.buttons.len(), 1);
        assert_eq!(updated.buttons[0].label, Some("Custom Label".to_string()));
    }

    #[test]
    fn test_update_changes_encoders() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Profile".to_string()).unwrap();

        let new_encoders = vec![EncoderConfig {
            index: 0,
            label: Some("Volume Knob".to_string()),
            press_action: None,
            long_press_action: None,
            clockwise_action: None,
            counter_clockwise_action: None,
        }];

        let update = ProfileUpdate {
            name: None,
            description: None,
            buttons: None,
            encoders: Some(new_encoders),
        };

        let updated = manager.update(&profile.id, update).unwrap();

        assert_eq!(updated.encoders.len(), 1);
        assert_eq!(updated.encoders[0].label, Some("Volume Knob".to_string()));
    }

    #[test]
    fn test_update_updates_timestamp() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Profile".to_string()).unwrap();
        let original_updated_at = profile.updated_at;

        // Small delay to ensure timestamp changes
        std::thread::sleep(std::time::Duration::from_millis(10));

        let update = ProfileUpdate {
            name: Some("New Name".to_string()),
            description: None,
            buttons: None,
            encoders: None,
        };

        let updated = manager.update(&profile.id, update).unwrap();

        assert!(updated.updated_at >= original_updated_at);
    }

    #[test]
    fn test_update_persists_to_disk() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Profile".to_string()).unwrap();

        let update = ProfileUpdate {
            name: Some("Persisted Name".to_string()),
            description: None,
            buttons: None,
            encoders: None,
        };

        manager.update(&profile.id, update).unwrap();

        // Load from disk
        let file_path = temp_dir.path().join(format!("{}.json", profile.id));
        let content = fs::read_to_string(&file_path).unwrap();
        let loaded: Profile = serde_json::from_str(&content).unwrap();

        assert_eq!(loaded.name, "Persisted Name");
    }

    #[test]
    fn test_update_returns_error_for_unknown_id() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let update = ProfileUpdate {
            name: Some("New Name".to_string()),
            description: None,
            buttons: None,
            encoders: None,
        };

        let result = manager.update("nonexistent-id", update);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Profile not found"));
    }

    // ========== Delete Tests ==========

    #[test]
    fn test_delete_removes_from_cache() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("To Delete".to_string()).unwrap();
        assert!(manager.get(&profile.id).is_some());

        manager.delete(&profile.id).unwrap();

        assert!(manager.get(&profile.id).is_none());
    }

    #[test]
    fn test_delete_removes_from_disk() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("To Delete".to_string()).unwrap();
        let file_path = temp_dir.path().join(format!("{}.json", profile.id));
        assert!(file_path.exists());

        manager.delete(&profile.id).unwrap();

        assert!(!file_path.exists());
    }

    #[test]
    fn test_delete_succeeds_for_unknown_id() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        // Should not error even if profile doesn't exist
        let result = manager.delete("nonexistent-id");
        assert!(result.is_ok());
    }

    #[test]
    fn test_delete_updates_list() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile1 = manager.create("Profile 1".to_string()).unwrap();
        let profile2 = manager.create("Profile 2".to_string()).unwrap();

        assert_eq!(manager.list().len(), 2);

        manager.delete(&profile1.id).unwrap();

        assert_eq!(manager.list().len(), 1);
        assert!(manager.get(&profile2.id).is_some());
    }

    // ========== Import Tests ==========

    #[test]
    fn test_import_creates_profile_from_json() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let original = create_profile_with_actions("Imported Profile");
        let json = serde_json::to_string(&original).unwrap();

        let imported = manager.import(&json).unwrap();

        assert_eq!(imported.name, "Imported Profile");
        assert_eq!(imported.buttons[0].label, Some("Volume".to_string()));
        assert_eq!(imported.encoders[0].label, Some("Brightness".to_string()));
    }

    #[test]
    fn test_import_generates_new_id() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let original = Profile::new("Original".to_string());
        let original_id = original.id.clone();
        let json = serde_json::to_string(&original).unwrap();

        let imported = manager.import(&json).unwrap();

        assert_ne!(imported.id, original_id);
    }

    #[test]
    fn test_import_updates_timestamp() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let mut original = Profile::new("Original".to_string());
        original.updated_at = 1000000000000; // Old timestamp
        let json = serde_json::to_string(&original).unwrap();

        let imported = manager.import(&json).unwrap();

        assert!(imported.updated_at > original.updated_at);
    }

    #[test]
    fn test_import_adds_to_cache() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let original = Profile::new("Original".to_string());
        let json = serde_json::to_string(&original).unwrap();

        let imported = manager.import(&json).unwrap();

        assert!(manager.get(&imported.id).is_some());
    }

    #[test]
    fn test_import_saves_to_disk() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let original = Profile::new("Original".to_string());
        let json = serde_json::to_string(&original).unwrap();

        let imported = manager.import(&json).unwrap();
        let file_path = temp_dir.path().join(format!("{}.json", imported.id));

        assert!(file_path.exists());
    }

    #[test]
    fn test_import_returns_error_for_invalid_json() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let result = manager.import("{ invalid json }");

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to parse profile JSON"));
    }

    // ========== Export Tests ==========

    #[test]
    fn test_export_returns_valid_json() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Export Test".to_string()).unwrap();
        let json = manager.export(&profile.id).unwrap();

        // Should be valid JSON
        let parsed: Result<Profile, _> = serde_json::from_str(&json);
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_export_includes_all_fields() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let profile = manager.create("Complete Profile".to_string()).unwrap();

        // Update with some data
        let buttons = vec![ButtonConfig {
            index: 0,
            label: Some("Test Button".to_string()),
            image: None,
            action: None,
            long_press_action: None,
        }];

        let update = ProfileUpdate {
            name: None,
            description: Some("Test description".to_string()),
            buttons: Some(buttons),
            encoders: None,
        };
        manager.update(&profile.id, update).unwrap();

        let json = manager.export(&profile.id).unwrap();

        assert!(json.contains("Complete Profile"));
        assert!(json.contains("Test description"));
        assert!(json.contains("Test Button"));
    }

    #[test]
    fn test_export_returns_error_for_unknown_id() {
        let temp_dir = create_test_dir();
        let manager = ProfileManager::new(temp_dir.path().to_path_buf());

        let result = manager.export("nonexistent-id");

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Profile not found"));
    }

    #[test]
    fn test_export_import_roundtrip() {
        let temp_dir = create_test_dir();
        let mut manager = ProfileManager::new(temp_dir.path().to_path_buf());

        // Create a profile with data
        let original = manager.create("Roundtrip Test".to_string()).unwrap();

        let buttons = vec![ButtonConfig {
            index: 0,
            label: Some("Roundtrip Button".to_string()),
            image: None,
            action: None,
            long_press_action: None,
        }];

        let update = ProfileUpdate {
            name: None,
            description: Some("Roundtrip description".to_string()),
            buttons: Some(buttons),
            encoders: None,
        };
        manager.update(&original.id, update).unwrap();

        // Export
        let json = manager.export(&original.id).unwrap();

        // Import
        let imported = manager.import(&json).unwrap();

        // Verify data preserved (except ID)
        assert_ne!(imported.id, original.id);
        assert_eq!(imported.name, "Roundtrip Test");
        assert_eq!(imported.description, Some("Roundtrip description".to_string()));
        assert_eq!(imported.buttons.len(), 1);
        assert_eq!(imported.buttons[0].label, Some("Roundtrip Button".to_string()));
    }

    // ========== Profile Type Tests ==========

    #[test]
    fn test_profile_new_has_valid_uuid() {
        let profile = Profile::new("Test".to_string());

        // UUID v4 format
        assert_eq!(profile.id.len(), 36);
        assert!(profile.id.contains('-'));
    }

    #[test]
    fn test_profile_new_has_timestamps() {
        let profile = Profile::new("Test".to_string());

        assert!(profile.created_at > 0);
        assert!(profile.updated_at > 0);
        assert_eq!(profile.created_at, profile.updated_at);
    }

    #[test]
    fn test_profile_serializes_to_camel_case() {
        let profile = Profile::new("Test".to_string());
        let json = serde_json::to_string(&profile).unwrap();

        assert!(json.contains("\"createdAt\""));
        assert!(json.contains("\"updatedAt\""));
        assert!(!json.contains("\"created_at\""));
    }
}
