//! Configuration Type Definitions
//!
//! Types for application settings, profiles, and button/encoder configurations.

use serde::{Deserialize, Serialize};
use crate::actions::types::Action;

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// Active profile ID
    pub active_profile_id: Option<String>,
    /// Display brightness (0-100)
    pub brightness: u8,
    /// Start application minimized to tray
    pub start_minimized: bool,
    /// Start application on system boot
    pub auto_launch: bool,
    /// Home Assistant configuration
    pub home_assistant: Option<HomeAssistantConfig>,
    /// Node-RED configuration
    pub node_red: Option<NodeRedConfig>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            active_profile_id: None,
            brightness: 80,
            start_minimized: false,
            auto_launch: false,
            home_assistant: None,
            node_red: None,
        }
    }
}

/// Home Assistant connection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeAssistantConfig {
    pub url: String,
    pub token: String,
}

/// Node-RED connection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeRedConfig {
    pub url: String,
}

/// Device profile containing button and encoder configurations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    /// Unique profile ID
    pub id: String,
    /// Profile display name
    pub name: String,
    /// Profile description
    #[serde(default)]
    pub description: Option<String>,
    /// Button configurations (6 buttons)
    #[serde(default)]
    pub buttons: Vec<ButtonConfig>,
    /// Encoder configurations (2 encoders)
    #[serde(default)]
    pub encoders: Vec<EncoderConfig>,
    /// Creation timestamp
    pub created_at: u64,
    /// Last modified timestamp
    pub updated_at: u64,
}

impl Profile {
    /// Create a new empty profile
    pub fn new(name: String) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description: None,
            buttons: vec![], // Sparse array - only contains buttons with configurations
            encoders: vec![], // Sparse array - only contains encoders with configurations
            created_at: now,
            updated_at: now,
        }
    }
}

/// Configuration for a single button
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ButtonConfig {
    /// Button index (0-based)
    #[serde(default)]
    pub index: usize,
    /// Button label
    #[serde(default)]
    pub label: Option<String>,
    /// Button image (base64 encoded)
    #[serde(default)]
    pub image: Option<String>,
    /// Action executed on button press
    #[serde(default)]
    pub action: Option<Action>,
    /// Action executed on long press
    #[serde(default)]
    pub long_press_action: Option<Action>,
    /// Action executed on button press while shift is held
    #[serde(default)]
    pub shift_action: Option<Action>,
    /// Action executed on long press while shift is held
    #[serde(default)]
    pub shift_long_press_action: Option<Action>,
}

/// Configuration for a single encoder
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncoderConfig {
    /// Encoder index (0-based)
    #[serde(default)]
    pub index: usize,
    /// Encoder label
    #[serde(default)]
    pub label: Option<String>,
    /// Action executed on encoder press
    #[serde(default)]
    pub press_action: Option<Action>,
    /// Action executed on long press
    #[serde(default)]
    pub long_press_action: Option<Action>,
    /// Action executed on clockwise rotation
    #[serde(default)]
    pub clockwise_action: Option<Action>,
    /// Action executed on counter-clockwise rotation
    #[serde(default)]
    pub counter_clockwise_action: Option<Action>,
    /// Action executed on encoder press while shift is held
    #[serde(default)]
    pub shift_press_action: Option<Action>,
    /// Action executed on long press while shift is held
    #[serde(default)]
    pub shift_long_press_action: Option<Action>,
    /// Action executed on clockwise rotation while shift is held
    #[serde(default)]
    pub shift_clockwise_action: Option<Action>,
    /// Action executed on counter-clockwise rotation while shift is held
    #[serde(default)]
    pub shift_counter_clockwise_action: Option<Action>,
}

/// Profile update request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileUpdate {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub buttons: Option<Vec<ButtonConfig>>,
    #[serde(default)]
    pub encoders: Option<Vec<EncoderConfig>>,
}
