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
