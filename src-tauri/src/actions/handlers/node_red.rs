//! Node-RED Handler
//!
//! Triggers Node-RED flows via HTTP.

use crate::actions::types::{ActionResult, NodeRedAction};
use std::time::Duration;

/// Execute a Node-RED action
pub async fn execute(config: &NodeRedAction) -> ActionResult {
    log::debug!("Executing Node-RED action: flow_id={}", config.flow_id);

    // TODO: Get Node-RED URL from config
    let nr_url = std::env::var("NODE_RED_URL").unwrap_or_default();

    if nr_url.is_empty() {
        return ActionResult::failure("Node-RED not configured".to_string(), 0);
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build();

    let client = match client {
        Ok(c) => c,
        Err(e) => return ActionResult::failure(format!("Failed to create HTTP client: {}", e), 0),
    };

    let url = format!("{}/inject/{}", nr_url, config.flow_id);

    let mut request = client.post(&url);

    if let Some(ref payload) = config.payload {
        request = request.header("Content-Type", "application/json").json(payload);
    }

    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                ActionResult::success(0)
            } else {
                ActionResult::failure(format!("Node-RED request failed: {}", response.status()), 0)
            }
        }
        Err(e) => ActionResult::failure(format!("Node-RED request failed: {}", e), 0),
    }
}
