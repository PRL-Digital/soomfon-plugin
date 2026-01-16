//! Action Type Definitions
//!
//! Contains all action types and their configurations.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Available action types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ActionType {
    Keyboard,
    Media,
    Launch,
    Script,
    Http,
    System,
    Text,
    Profile,
    HomeAssistant,
    NodeRed,
}

/// Keyboard action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardAction {
    pub key: String,
    #[serde(default)]
    pub modifiers: Vec<String>,
}

/// Media action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaAction {
    pub action: MediaActionType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MediaActionType {
    PlayPause,
    NextTrack,
    PreviousTrack,
    VolumeUp,
    VolumeDown,
    VolumeMute,
    Stop,
}

/// Launch action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchAction {
    pub path: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub working_directory: Option<String>,
}

/// Script action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptAction {
    pub script_type: ScriptType,
    pub content: String,
    #[serde(default)]
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ScriptType {
    PowerShell,
    Bash,
    Cmd,
    File,
}

/// HTTP action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpAction {
    pub method: HttpMethod,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
}

impl std::fmt::Display for HttpMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HttpMethod::Get => write!(f, "GET"),
            HttpMethod::Post => write!(f, "POST"),
            HttpMethod::Put => write!(f, "PUT"),
            HttpMethod::Delete => write!(f, "DELETE"),
            HttpMethod::Patch => write!(f, "PATCH"),
        }
    }
}

/// System action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemAction {
    pub action: SystemActionType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SystemActionType {
    Lock,
    Sleep,
    Hibernate,
    Screenshot,
    OpenUrl,
}

/// Text action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextAction {
    pub text: String,
    #[serde(default)]
    pub delay_ms: Option<u64>,
}

/// Profile action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileAction {
    #[serde(default)]
    pub profile_id: Option<String>,
    #[serde(default)]
    pub profile_name: Option<String>,
}

/// Home Assistant action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeAssistantAction {
    pub action_type: HomeAssistantActionType,
    pub entity_id: String,
    #[serde(default)]
    pub service: Option<String>,
    #[serde(default)]
    pub service_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HomeAssistantActionType {
    CallService,
    Toggle,
    TurnOn,
    TurnOff,
    FireEvent,
}

/// Node-RED action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeRedAction {
    pub flow_id: String,
    #[serde(default)]
    pub payload: Option<serde_json::Value>,
}

/// Unified action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Action {
    Keyboard(KeyboardAction),
    Media(MediaAction),
    Launch(LaunchAction),
    Script(ScriptAction),
    Http(HttpAction),
    System(SystemAction),
    Text(TextAction),
    Profile(ProfileAction),
    HomeAssistant(HomeAssistantAction),
    NodeRed(NodeRedAction),
}

/// Result of action execution
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionResult {
    pub success: bool,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
    pub duration_ms: u64,
}

impl ActionResult {
    pub fn success(duration_ms: u64) -> Self {
        Self {
            success: true,
            message: None,
            error: None,
            duration_ms,
        }
    }

    pub fn success_with_message(message: String, duration_ms: u64) -> Self {
        Self {
            success: true,
            message: Some(message),
            error: None,
            duration_ms,
        }
    }

    pub fn failure(error: String, duration_ms: u64) -> Self {
        Self {
            success: false,
            message: None,
            error: Some(error),
            duration_ms,
        }
    }
}
