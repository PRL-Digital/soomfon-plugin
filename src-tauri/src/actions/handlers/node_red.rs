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
    log::debug!("Executing Node-RED action: flow_id={}", config.flow_id);

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

/// Execute a Node-RED action (backwards-compatible, uses env vars)
pub async fn execute(config: &NodeRedAction) -> ActionResult {
    execute_with_config(config, None).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_red_action_deserialize() {
        let json = r#"{
            "flowId": "my-flow-123",
            "payload": {"key": "value", "count": 42}
        }"#;

        let action: NodeRedAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.flow_id, "my-flow-123");
        assert!(action.payload.is_some());

        let payload = action.payload.unwrap();
        assert_eq!(payload["key"], "value");
        assert_eq!(payload["count"], 42);
    }

    #[test]
    fn test_node_red_action_without_payload() {
        let json = r#"{"flowId": "simple-flow"}"#;

        let action: NodeRedAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.flow_id, "simple-flow");
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

    // ========== Config-based execution tests ==========

    #[tokio::test]
    async fn test_execute_with_config_none_falls_back_to_env() {
        // When no config is provided, should check env vars
        // Since env vars are not set, should return "not configured" error
        let action = NodeRedAction {
            flow_id: "test-flow".to_string(),
            payload: None,
        };

        let result = execute_with_config(&action, None).await;
        assert!(!result.success);
        assert!(result.error.as_ref().unwrap().contains("not configured"));
    }

    #[tokio::test]
    async fn test_execute_with_config_empty_url_fails() {
        let action = NodeRedAction {
            flow_id: "test-flow".to_string(),
            payload: None,
        };

        let config = NodeRedConfig {
            url: "".to_string(),
        };

        let result = execute_with_config(&action, Some(&config)).await;
        assert!(!result.success);
        assert!(result.error.as_ref().unwrap().contains("not configured"));
    }
}
