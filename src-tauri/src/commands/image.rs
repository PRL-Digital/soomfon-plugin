//! Image Commands
//!
//! Tauri commands for image-related operations including HTTP fetching.

use crate::image::processor;

/// Fetch an image from an HTTP(S) URL and return as a data URL
///
/// This command bypasses browser CORS restrictions by fetching through the Rust backend.
/// Returns a data URL (data:mime/type;base64,...) that can be used directly in img elements.
#[tauri::command]
pub async fn fetch_image_as_data_url(url: String) -> Result<String, String> {
    // Validate URL
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL must start with http:// or https://".to_string());
    }

    let bytes = processor::fetch_http_image(&url).await?;
    Ok(processor::image_to_data_url(&bytes))
}
