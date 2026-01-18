//! SOOMFON Controller - Tauri Backend
//!
//! This library provides the Rust backend for the SOOMFON Controller application.
//! It handles HID device communication, action execution, and configuration management.

pub mod commands;
pub mod hid;
pub mod actions;
pub mod config;
pub mod image;
pub mod tray;
pub mod system;

use tauri::Manager;

/// Initialize the Tauri application with all plugins and state
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize logging (debug level to see device communication)
            env_logger::Builder::from_env(
                env_logger::Env::default().default_filter_or("debug")
            ).init();

            log::info!("SOOMFON Controller starting...");

            // Initialize HID manager state
            let hid_manager = hid::manager::HidManager::new();
            app.manage(std::sync::Arc::new(parking_lot::Mutex::new(hid_manager)));

            // Initialize config manager state
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            let config_manager = config::manager::ConfigManager::new(app_data_dir.clone());
            app.manage(std::sync::Arc::new(parking_lot::Mutex::new(config_manager)));

            // Initialize profile manager state
            let profiles_dir = app_data_dir.join("profiles");
            let profile_manager = config::profiles::ProfileManager::new(profiles_dir);
            app.manage(std::sync::Arc::new(parking_lot::Mutex::new(profile_manager)));

            // Initialize action engine state
            let action_engine = actions::engine::ActionEngine::new();
            app.manage(std::sync::Arc::new(parking_lot::Mutex::new(action_engine)));

            log::info!("SOOMFON Controller initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Device commands
            commands::device::connect_device,
            commands::device::disconnect_device,
            commands::device::get_device_status,
            commands::device::set_brightness,
            commands::device::set_button_image,
            commands::device::clear_button,
            commands::device::enumerate_devices,
            // Config commands
            commands::config::get_app_settings,
            commands::config::set_app_settings,
            commands::config::get_profiles,
            commands::config::get_active_profile,
            commands::config::set_active_profile,
            commands::config::create_profile,
            commands::config::update_profile,
            commands::config::delete_profile,
            commands::config::import_profile,
            commands::config::export_profile,
            // Action commands
            commands::actions::execute_action,
            commands::actions::cancel_action,
            commands::actions::get_action_history,
            // System commands
            commands::system::get_auto_launch,
            commands::system::set_auto_launch,
            commands::system::open_file_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
