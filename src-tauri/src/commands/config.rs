//! Config Commands
//!
//! Tauri commands for configuration and profile management.

use crate::config::manager::ConfigManager;
use crate::config::profiles::ProfileManager;
use crate::config::types::{AppSettings, Profile, ProfileUpdate};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

/// Get application settings
#[tauri::command]
pub fn get_app_settings(
    manager: State<Arc<Mutex<ConfigManager>>>,
) -> AppSettings {
    let manager = manager.lock();
    manager.get_settings().clone()
}

/// Set application settings
#[tauri::command]
pub fn set_app_settings(
    settings: AppSettings,
    manager: State<Arc<Mutex<ConfigManager>>>,
) -> Result<(), String> {
    let mut manager = manager.lock();
    manager.set_settings(settings)
}

/// Get all profiles
#[tauri::command]
pub fn get_profiles(
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Vec<Profile> {
    let manager = manager.lock();
    manager.list().into_iter().cloned().collect()
}

/// Get active profile
#[tauri::command]
pub fn get_active_profile(
    config_manager: State<Arc<Mutex<ConfigManager>>>,
    profile_manager: State<Arc<Mutex<ProfileManager>>>,
) -> Option<Profile> {
    let config = config_manager.lock();
    let profiles = profile_manager.lock();

    config
        .get_active_profile_id()
        .and_then(|id| profiles.get(id).cloned())
}

/// Set active profile
#[tauri::command]
pub fn set_active_profile(
    id: String,
    manager: State<Arc<Mutex<ConfigManager>>>,
) -> Result<(), String> {
    let mut manager = manager.lock();
    manager.set_active_profile_id(Some(id))
}

/// Create a new profile
#[tauri::command]
pub fn create_profile(
    name: String,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<Profile, String> {
    let mut manager = manager.lock();
    manager.create(name)
}

/// Update an existing profile
#[tauri::command]
pub fn update_profile(
    id: String,
    update: ProfileUpdate,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<Profile, String> {
    let mut manager = manager.lock();
    manager.update(&id, update)
}

/// Delete a profile
#[tauri::command]
pub fn delete_profile(
    id: String,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<(), String> {
    let mut manager = manager.lock();
    manager.delete(&id)
}

/// Import a profile from JSON
#[tauri::command]
pub fn import_profile(
    json: String,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<Profile, String> {
    let mut manager = manager.lock();
    manager.import(&json)
}

/// Export a profile to JSON
#[tauri::command]
pub fn export_profile(
    id: String,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<String, String> {
    let manager = manager.lock();
    manager.export(&id)
}
