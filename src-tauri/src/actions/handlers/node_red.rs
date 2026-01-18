//! Node-RED Handler
//!
//! Triggers Node-RED flows via HTTP.

use crate::actions::types::{ActionResult, NodeRedAction};
use crate::config::types::NodeRedConfig;
use std::time::Duration;

/// Execute a Node-RED action with configuration
pub async fn execute_with_config(
    config: &NodeRedAction,
    nr_config: Option<&NodeRedConfig>,
) -> ActionResult {
    log::debug!("Executing Node-RED action: endpoint={}", config.endpoint);

    // Get Node-RED URL from config, falling back to environment variable
    let nr_url = match nr_config {
        Some(cfg) => cfg.url.clone(),
        None => {
            // Fallback to environment variable for backwards compatibility
            std::env::var("NODE_RED_URL").unwrap_or_default()
        }
    };

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

    let url = format!("{}{}", nr_url, config.endpoint);

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

/// Execute a Node-RED action (backwards-compatible, uses env vars)
pub async fn execute(config: &NodeRedAction) -> ActionResult {
    execute_with_config(config, None).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actions::types::NodeRedOperationType;

    #[test]
    fn test_node_red_action_deserialize() {
        let json = r#"{
            "operation": "trigger_flow",
            "endpoint": "/my-webhook",
            "payload": {"key": "value", "count": 42}
        }"#;

        let action: NodeRedAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.endpoint, "/my-webhook");
        assert_eq!(action.operation, NodeRedOperationType::TriggerFlow);
        assert!(action.payload.is_some());

        let payload = action.payload.unwrap();
        assert_eq!(payload["key"], "value");
        assert_eq!(payload["count"], 42);
    }

    #[test]
    fn test_node_red_action_without_payload() {
        let json = r#"{"operation": "trigger_flow", "endpoint": "/simple"}"#;

        let action: NodeRedAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.endpoint, "/simple");
        assert!(action.payload.is_none());
    }

    #[test]
    fn test_node_red_config_serialization() {
        let config = NodeRedConfig {
            url: "http://nodered.local:1880".to_string(),
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"url\":\"http://nodered.local:1880\""));

        let deserialized: NodeRedConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.url, config.url);
    }
}
