//! HTTP Handler
//!
//! Makes HTTP requests (GET, POST, PUT, DELETE, PATCH).

use crate::actions::types::{ActionResult, HttpAction, HttpMethod};
use std::time::Duration;

/// Default HTTP timeout in milliseconds
const DEFAULT_TIMEOUT_MS: u64 = 30000;

/// Execute an HTTP action
pub async fn execute(config: &HttpAction) -> ActionResult {
    log::debug!("Executing HTTP action: {} {}", config.method, config.url);

    let timeout_ms = config.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .build();

    let client = match client {
        Ok(c) => c,
        Err(e) => return ActionResult::failure(format!("Failed to create HTTP client: {}", e), 0),
    };

    let mut request = match config.method {
        HttpMethod::Get => client.get(&config.url),
        HttpMethod::Post => client.post(&config.url),
        HttpMethod::Put => client.put(&config.url),
        HttpMethod::Delete => client.delete(&config.url),
        HttpMethod::Patch => client.patch(&config.url),
    };

    // Add headers
    for (key, value) in &config.headers {
        request = request.header(key, value);
    }

    // Add body if present
    if let Some(ref body) = config.body {
        request = request.body(body.clone());
    }

    match request.send().await {
        Ok(response) => {
            let status = response.status();
            if status.is_success() {
                match response.text().await {
                    Ok(text) => ActionResult::success_with_message(text, 0),
                    Err(_) => ActionResult::success(0),
                }
            } else {
                ActionResult::failure(format!("HTTP request failed with status: {}", status), 0)
            }
        }
        Err(e) => ActionResult::failure(format!("HTTP request failed: {}", e), 0),
    }
}
