//! Config Commands
//!
//! Tauri commands for configuration and profile management.
//! Emits Tauri events for profile and config changes to support frontend reactivity.

use crate::config::manager::ConfigManager;
use crate::config::profiles::ProfileManager;
use crate::config::types::{AppSettings, Profile, ProfileUpdate};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

/// Profile change event payload
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProfileChangeEvent {
    pub event_type: String,
    pub profile: Profile,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_profile_id: Option<String>,
}

/// Config change event payload
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfigChangeEvent {
    pub change_type: String,
    pub new_value: serde_json::Value,
}

/// Get application settings
#[tauri::command]
pub fn get_app_settings(
    manager: State<Arc<Mutex<ConfigManager>>>,
) -> AppSettings {
    let manager = manager.lock();
    manager.get_settings().clone()
}

/// Set application settings
/// Emits `config:changed` event on success
#[tauri::command]
pub fn set_app_settings(
    app: AppHandle,
    settings: AppSettings,
    manager: State<Arc<Mutex<ConfigManager>>>,
) -> Result<(), String> {
    let mut manager = manager.lock();
    manager.set_settings(settings.clone())?;

    // Emit config changed event
    let event = ConfigChangeEvent {
        change_type: "appSettings".to_string(),
        new_value: serde_json::to_value(&settings).unwrap_or(serde_json::Value::Null),
    };
    if let Err(e) = app.emit("config:changed", event) {
        log::warn!("Failed to emit config:changed event: {}", e);
    }

    Ok(())
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
/// Emits `profile:changed` event with type "activated" on success
#[tauri::command]
pub fn set_active_profile(
    app: AppHandle,
    id: String,
    manager: State<Arc<Mutex<ConfigManager>>>,
    profile_manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<(), String> {
    let mut config = manager.lock();
    config.set_active_profile_id(Some(id.clone()))?;

    // Emit profile changed event
    let profiles = profile_manager.lock();
    if let Some(profile) = profiles.get(&id) {
        let event = ProfileChangeEvent {
            event_type: "activated".to_string(),
            profile: profile.clone(),
            source_profile_id: None,
        };
        if let Err(e) = app.emit("profile:changed", event) {
            log::warn!("Failed to emit profile:changed event: {}", e);
        }
    }

    Ok(())
}

/// Create a new profile
/// Emits `profile:changed` event with type "created" on success
#[tauri::command]
pub fn create_profile(
    app: AppHandle,
    name: String,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<Profile, String> {
    let mut manager = manager.lock();
    let profile = manager.create(name)?;

    // Emit profile changed event
    let event = ProfileChangeEvent {
        event_type: "created".to_string(),
        profile: profile.clone(),
        source_profile_id: None,
    };
    if let Err(e) = app.emit("profile:changed", event) {
        log::warn!("Failed to emit profile:changed event: {}", e);
    }

    Ok(profile)
}

/// Update an existing profile
/// Emits `profile:changed` event with type "updated" on success
#[tauri::command]
pub fn update_profile(
    app: AppHandle,
    id: String,
    updates: ProfileUpdate,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<Profile, String> {
    let mut manager = manager.lock();
    let profile = manager.update(&id, updates)?;

    // Emit profile changed event
    let event = ProfileChangeEvent {
        event_type: "updated".to_string(),
        profile: profile.clone(),
        source_profile_id: None,
    };
    if let Err(e) = app.emit("profile:changed", event) {
        log::warn!("Failed to emit profile:changed event: {}", e);
    }

    Ok(profile)
}

/// Delete a profile
/// Emits `profile:changed` event with type "deleted" on success
#[tauri::command]
pub fn delete_profile(
    app: AppHandle,
    id: String,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<(), String> {
    let mut manager = manager.lock();

    // Get profile before deletion for the event
    let profile = manager.get(&id).cloned();

    manager.delete(&id)?;

    // Emit profile changed event
    if let Some(profile) = profile {
        let event = ProfileChangeEvent {
            event_type: "deleted".to_string(),
            profile,
            source_profile_id: None,
        };
        if let Err(e) = app.emit("profile:changed", event) {
            log::warn!("Failed to emit profile:changed event: {}", e);
        }
    }

    Ok(())
}

/// Import a profile from JSON
/// Emits `profile:changed` event with type "created" on success
#[tauri::command]
pub fn import_profile(
    app: AppHandle,
    json: String,
    manager: State<Arc<Mutex<ProfileManager>>>,
) -> Result<Profile, String> {
    let mut manager = manager.lock();
    let profile = manager.import(&json)?;

    // Emit profile changed event
    let event = ProfileChangeEvent {
        event_type: "created".to_string(),
        profile: profile.clone(),
        source_profile_id: None,
    };
    if let Err(e) = app.emit("profile:changed", event) {
        log::warn!("Failed to emit profile:changed event: {}", e);
    }

    Ok(profile)
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
