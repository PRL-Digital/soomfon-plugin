//! System Commands
//!
//! Tauri commands for system-level operations.

use crate::system::auto_launch;
use tauri::AppHandle;

/// Get auto-launch status
#[tauri::command]
pub fn get_auto_launch() -> bool {
    auto_launch::is_enabled()
}

/// Set auto-launch status
#[tauri::command]
pub fn set_auto_launch(
    enabled: bool,
    _app: AppHandle,
) -> Result<(), String> {
    if enabled {
        // Get the executable path
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get executable path: {}", e))?;

        auto_launch::enable(exe_path.to_string_lossy().as_ref())
    } else {
        auto_launch::disable()
    }
}

/// Open a file dialog
#[tauri::command]
pub async fn open_file_dialog(
    _title: Option<String>,
    _filters: Option<Vec<FileFilter>>,
    _default_path: Option<String>,
) -> Result<Option<String>, String> {
    // TODO: Implement file dialog using tauri-plugin-dialog
    // For now, return an error indicating it's not implemented
    Err("File dialog not yet implemented - needs tauri-plugin-dialog".to_string())
}

#[derive(serde::Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}
