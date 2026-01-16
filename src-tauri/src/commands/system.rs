//! System Commands
//!
//! Tauri commands for system-level operations including auto-launch and file dialogs.

use crate::system::auto_launch;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

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

/// File filter configuration for file dialogs
#[derive(serde::Deserialize, Clone)]
pub struct FileFilter {
    /// Display name for the filter (e.g., "Images")
    pub name: String,
    /// File extensions without dots (e.g., ["png", "jpg"])
    pub extensions: Vec<String>,
}

/// Options for opening a file dialog
#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileDialogOptions {
    /// Dialog window title
    pub title: Option<String>,
    /// File filters to restrict selectable file types
    pub filters: Option<Vec<FileFilter>>,
    /// Starting directory path
    pub default_path: Option<String>,
    /// Properties controlling dialog behavior
    /// Supported: "openFile", "openDirectory", "multiSelections"
    pub properties: Option<Vec<String>>,
}

/// Open a file dialog and return selected file path(s)
///
/// Returns a vector of selected file paths. Empty if the dialog was cancelled.
/// This matches the Electron API for easier frontend migration.
///
/// Uses blocking_* methods since this is an async command that runs off the main thread.
#[tauri::command]
pub async fn open_file_dialog(
    app: AppHandle,
    options: Option<OpenFileDialogOptions>,
) -> Result<Vec<String>, String> {
    let options = options.unwrap_or_default();
    let properties = options.properties.unwrap_or_default();

    // Determine dialog mode from properties
    let is_directory = properties.iter().any(|p| p == "openDirectory");
    let is_multiple = properties.iter().any(|p| p == "multiSelections");

    // Build the file dialog
    let mut builder = app.dialog().file();

    // Set title if provided
    if let Some(title) = options.title {
        builder = builder.set_title(title);
    }

    // Set starting directory if provided
    if let Some(default_path) = options.default_path {
        let path = std::path::PathBuf::from(&default_path);
        // If the path is a file, use its parent directory
        if path.is_file() {
            if let Some(parent) = path.parent() {
                builder = builder.set_directory(parent);
                // Also set the filename
                if let Some(file_name) = path.file_name() {
                    builder = builder.set_file_name(file_name.to_string_lossy());
                }
            }
        } else {
            builder = builder.set_directory(&path);
        }
    }

    // Add file filters
    if let Some(filters) = options.filters {
        for filter in filters {
            // Convert extensions to &str slice
            let ext_refs: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(&filter.name, &ext_refs);
        }
    }

    // Handle different dialog modes using blocking methods (safe in async commands)
    // FilePath implements Display, so we use to_string() to convert to String
    if is_directory {
        // Directory picker (single selection only, multi-directory not commonly supported)
        let result = builder.blocking_pick_folder();

        match result {
            Some(path) => Ok(vec![path.to_string()]),
            None => Ok(vec![]), // Cancelled
        }
    } else if is_multiple {
        // Multiple file selection
        let result = builder.blocking_pick_files();

        match result {
            Some(paths) => {
                let string_paths: Vec<String> = paths
                    .iter()
                    .map(|p| p.to_string())
                    .collect();
                Ok(string_paths)
            }
            None => Ok(vec![]), // Cancelled
        }
    } else {
        // Single file selection
        let result = builder.blocking_pick_file();

        match result {
            Some(path) => Ok(vec![path.to_string()]),
            None => Ok(vec![]), // Cancelled
        }
    }
}
