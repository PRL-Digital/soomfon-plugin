//! Home Assistant Handler
//!
//! Integrates with Home Assistant for smart home control.
//!
//! Supported operations:
//! - Toggle: Toggle entity state
//! - TurnOn: Turn entity on
//! - TurnOff: Turn entity off
//! - CallService: Call any Home Assistant service
//! - FireEvent: Fire a Home Assistant event

use crate::actions::types::{ActionResult, HomeAssistantAction, HomeAssistantActionType};
use std::time::Duration;

/// Execute a Home Assistant action
pub async fn execute(config: &HomeAssistantAction) -> ActionResult {
    log::debug!("Executing Home Assistant action: {:?}", config.action_type);

    // Get Home Assistant URL and token from environment variables
    // In the frontend migration (Phase 7), this will be updated to use the config system
    let ha_url = std::env::var("HOME_ASSISTANT_URL").unwrap_or_default();
    let ha_token = std::env::var("HOME_ASSISTANT_TOKEN").unwrap_or_default();

    if ha_url.is_empty() || ha_token.is_empty() {
        return ActionResult::failure("Home Assistant not configured".to_string(), 0);
    }

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
    {
        Ok(c) => c,
        Err(e) => return ActionResult::failure(format!("Failed to create HTTP client: {}", e), 0),
    };

    match config.action_type {
        HomeAssistantActionType::Toggle => {
            call_service(&client, &ha_url, &ha_token, "homeassistant", "toggle", config).await
        }
        HomeAssistantActionType::TurnOn => {
            call_service(&client, &ha_url, &ha_token, "homeassistant", "turn_on", config).await
        }
        HomeAssistantActionType::TurnOff => {
            call_service(&client, &ha_url, &ha_token, "homeassistant", "turn_off", config).await
        }
        HomeAssistantActionType::CallService => {
            if let Some(ref service) = config.service {
                let parts: Vec<&str> = service.split('.').collect();
                if parts.len() == 2 {
                    call_service(&client, &ha_url, &ha_token, parts[0], parts[1], config).await
                } else {
                    ActionResult::failure(
                        "Invalid service format. Expected 'domain.service' (e.g., 'light.turn_on')".to_string(),
                        0,
                    )
                }
            } else {
                ActionResult::failure("Service not specified for CallService action".to_string(), 0)
            }
        }
        HomeAssistantActionType::FireEvent => {
            fire_event(&client, &ha_url, &ha_token, config).await
        }
    }
}

/// Call a Home Assistant service
async fn call_service(
    client: &reqwest::Client,
    ha_url: &str,
    ha_token: &str,
    domain: &str,
    service: &str,
    config: &HomeAssistantAction,
) -> ActionResult {
    let url = format!("{}/api/services/{}/{}", ha_url, domain, service);

    // Build request body with entity_id and optional service_data
    let mut body = serde_json::json!({
        "entity_id": config.entity_id
    });

    // Merge service_data if provided
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
                ActionResult::success_with_message(
                    format!("Called {}.{} for {}", domain, service, config.entity_id),
                    0,
                )
            } else {
                let status = resp.status();
                let error_text = resp.text().await.unwrap_or_default();
                ActionResult::failure(
                    format!("Home Assistant request failed ({}): {}", status, error_text),
                    0,
                )
            }
        }
        Err(e) => ActionResult::failure(format!("Home Assistant request failed: {}", e), 0),
    }
}

/// Fire a Home Assistant event
///
/// The event type is derived from entity_id (used as event_type)
/// and event_data comes from service_data
async fn fire_event(
    client: &reqwest::Client,
    ha_url: &str,
    ha_token: &str,
    config: &HomeAssistantAction,
) -> ActionResult {
    // For FireEvent, entity_id is used as the event_type
    // This aligns with how events are fired in Home Assistant
    let event_type = &config.entity_id;

    // Validate event type (must not be empty)
    if event_type.is_empty() {
        return ActionResult::failure("Event type (entity_id) is required for FireEvent".to_string(), 0);
    }

    let url = format!("{}/api/events/{}", ha_url, event_type);

    // Build event data from service_data (can be empty object)
    let body = config.service_data.clone().unwrap_or_else(|| serde_json::json!({}));

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
                ActionResult::success_with_message(format!("Fired event: {}", event_type), 0)
            } else {
                let status = resp.status();
                let error_text = resp.text().await.unwrap_or_default();
                ActionResult::failure(
                    format!("Failed to fire event ({}): {}", status, error_text),
                    0,
                )
            }
        }
        Err(e) => ActionResult::failure(format!("Failed to fire event: {}", e), 0),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_home_assistant_action_type_deserialize() {
        let types = [
            ("callService", HomeAssistantActionType::CallService),
            ("toggle", HomeAssistantActionType::Toggle),
            ("turnOn", HomeAssistantActionType::TurnOn),
            ("turnOff", HomeAssistantActionType::TurnOff),
            ("fireEvent", HomeAssistantActionType::FireEvent),
        ];

        for (json_value, expected) in types {
            let json = format!(
                r#"{{"actionType": "{}", "entityId": "light.test"}}"#,
                json_value
            );
            let action: HomeAssistantAction = serde_json::from_str(&json).unwrap();
            assert_eq!(action.action_type, expected, "Failed for {}", json_value);
        }
    }

    #[test]
    fn test_home_assistant_action_with_service_data() {
        let json = r#"{
            "actionType": "callService",
            "entityId": "light.living_room",
            "service": "light.turn_on",
            "serviceData": {"brightness": 255, "color_temp": 300}
        }"#;

        let action: HomeAssistantAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.action_type, HomeAssistantActionType::CallService);
        assert_eq!(action.entity_id, "light.living_room");
        assert_eq!(action.service, Some("light.turn_on".to_string()));
        assert!(action.service_data.is_some());

        let data = action.service_data.unwrap();
        assert_eq!(data["brightness"], 255);
        assert_eq!(data["color_temp"], 300);
    }

    #[test]
    fn test_fire_event_action() {
        let json = r#"{
            "actionType": "fireEvent",
            "entityId": "custom_event_name",
            "serviceData": {"key": "value", "number": 42}
        }"#;

        let action: HomeAssistantAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.action_type, HomeAssistantActionType::FireEvent);
        assert_eq!(action.entity_id, "custom_event_name");

        let data = action.service_data.unwrap();
        assert_eq!(data["key"], "value");
        assert_eq!(data["number"], 42);
    }
}
