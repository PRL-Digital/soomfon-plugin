//! Home Assistant Handler
//!
//! Integrates with Home Assistant for smart home control.

use crate::actions::types::{ActionResult, HomeAssistantAction, HomeAssistantActionType};
use std::time::Duration;

/// Execute a Home Assistant action
pub async fn execute(config: &HomeAssistantAction) -> ActionResult {
    log::debug!("Executing Home Assistant action: {:?}", config.action_type);

    // TODO: Get Home Assistant URL and token from config
    let ha_url = std::env::var("HOME_ASSISTANT_URL").unwrap_or_default();
    let ha_token = std::env::var("HOME_ASSISTANT_TOKEN").unwrap_or_default();

    if ha_url.is_empty() || ha_token.is_empty() {
        return ActionResult::failure("Home Assistant not configured".to_string(), 0);
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| ActionResult::failure(format!("Failed to create HTTP client: {}", e), 0));

    let client = match client {
        Ok(c) => c,
        Err(r) => return r,
    };

    let (service_domain, service_name) = match config.action_type {
        HomeAssistantActionType::Toggle => ("homeassistant", "toggle"),
        HomeAssistantActionType::TurnOn => ("homeassistant", "turn_on"),
        HomeAssistantActionType::TurnOff => ("homeassistant", "turn_off"),
        HomeAssistantActionType::CallService => {
            if let Some(ref service) = config.service {
                let parts: Vec<&str> = service.split('.').collect();
                if parts.len() == 2 {
                    (parts[0], parts[1])
                } else {
                    return ActionResult::failure("Invalid service format".to_string(), 0);
                }
            } else {
                return ActionResult::failure("Service not specified".to_string(), 0);
            }
        }
        HomeAssistantActionType::FireEvent => {
            // TODO: Implement fire_event endpoint
            return ActionResult::failure("Fire event not yet implemented".to_string(), 0);
        }
    };

    let url = format!("{}/api/services/{}/{}", ha_url, service_domain, service_name);

    let mut body = serde_json::json!({
        "entity_id": config.entity_id
    });

    if let Some(ref data) = config.service_data {
        if let Some(obj) = body.as_object_mut() {
            if let Some(data_obj) = data.as_object() {
                for (k, v) in data_obj {
                    obj.insert(k.clone(), v.clone());
                }
            }
        }
    }

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", ha_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                ActionResult::success(0)
            } else {
                ActionResult::failure(format!("Home Assistant request failed: {}", resp.status()), 0)
            }
        }
        Err(e) => ActionResult::failure(format!("Home Assistant request failed: {}", e), 0),
    }
}
