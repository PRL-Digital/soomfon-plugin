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
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    /// Key or key combination to send (frontend uses "keys")
    #[serde(alias = "key")]
    pub keys: String,
    #[serde(default)]
    pub modifiers: Vec<String>,
    #[serde(default)]
    pub hold_duration: Option<u64>,
}

/// Media action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaAction {
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    pub action: MediaActionType,
    #[serde(default)]
    pub volume_amount: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MediaActionType {
    PlayPause,
    #[serde(alias = "nextTrack")]
    Next,
    #[serde(alias = "previousTrack")]
    Previous,
    VolumeUp,
    VolumeDown,
    #[serde(alias = "volumeMute")]
    Mute,
    Stop,
}

/// Launch action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchAction {
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    pub path: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub working_directory: Option<String>,
    #[serde(default)]
    pub use_shell: Option<bool>,
}

/// Script action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptAction {
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    pub script_type: ScriptType,
    /// Inline script content
    #[serde(default)]
    pub script: Option<String>,
    /// Legacy field name for script content
    #[serde(default)]
    pub content: Option<String>,
    /// Path to script file
    #[serde(default)]
    pub script_path: Option<String>,
    #[serde(default)]
    pub timeout: Option<u64>,
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
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    pub method: HttpMethod,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub body_type: Option<String>,
    #[serde(default)]
    pub body: Option<serde_json::Value>,
    #[serde(default)]
    pub timeout: Option<u64>,
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
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    pub action: SystemActionType,
}

/// System action types matching the Electron implementation
/// Uses Windows keyboard shortcuts for consistent behavior:
/// - switch_desktop_left: Win+Ctrl+Left
/// - switch_desktop_right: Win+Ctrl+Right
/// - show_desktop: Win+D
/// - lock_screen: Win+L
/// - screenshot: Win+Shift+S (Snipping Tool)
/// - start_menu: Win key
/// - task_view: Win+Tab
/// - sleep: System sleep
/// - hibernate: System hibernate
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SystemActionType {
    SwitchDesktopLeft,
    SwitchDesktopRight,
    ShowDesktop,
    #[serde(alias = "lock")]
    LockScreen,
    Screenshot,
    StartMenu,
    TaskView,
    Sleep,
    Hibernate,
    #[serde(skip)]
    OpenUrl, // Deprecated: use Launch action instead
}

/// Text action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextAction {
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    pub text: String,
    #[serde(default)]
    pub type_delay: Option<u64>,
    #[serde(default)]
    pub delay_ms: Option<u64>,
}

/// Profile action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileAction {
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    #[serde(default)]
    pub profile_id: Option<String>,
    #[serde(default)]
    pub profile_name: Option<String>,
}

/// Home Assistant action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeAssistantAction {
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    /// Operation type (frontend uses "operation")
    #[serde(alias = "actionType")]
    pub operation: HomeAssistantOperationType,
    pub entity_id: String,
    #[serde(default)]
    pub brightness: Option<u8>,
    #[serde(default)]
    pub custom_service: Option<HomeAssistantCustomService>,
    // Legacy fields
    #[serde(default)]
    pub service: Option<String>,
    #[serde(default)]
    pub service_data: Option<serde_json::Value>,
}

/// Custom service call definition for Home Assistant
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeAssistantCustomService {
    pub domain: String,
    pub service: String,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HomeAssistantOperationType {
    Toggle,
    TurnOn,
    TurnOff,
    SetBrightness,
    RunScript,
    TriggerAutomation,
    Custom,
    // Legacy support
    #[serde(alias = "callService")]
    CallService,
    #[serde(alias = "fireEvent")]
    FireEvent,
}

// Legacy alias
pub type HomeAssistantActionType = HomeAssistantOperationType;

/// Node-RED action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeRedAction {
    // Common action fields from frontend BaseAction
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,

    /// Operation type
    pub operation: NodeRedOperationType,
    /// Webhook endpoint path
    pub endpoint: String,
    /// Event name for send_event operation
    #[serde(default)]
    pub event_name: Option<String>,
    #[serde(default)]
    pub payload: Option<serde_json::Value>,
    // Legacy field
    #[serde(default)]
    pub flow_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NodeRedOperationType {
    TriggerFlow,
    SendEvent,
    Custom,
}

/// Unified action configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    Keyboard(KeyboardAction),
    Media(MediaAction),
    Launch(LaunchAction),
    Script(ScriptAction),
    Http(HttpAction),
    System(SystemAction),
    Text(TextAction),
    Profile(ProfileAction),
    #[serde(alias = "homeAssistant")]
    HomeAssistant(HomeAssistantAction),
    #[serde(alias = "nodeRed")]
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

#[cfg(test)]
mod tests {
    use super::*;

    // ==========================================================================
    // ActionType Tests
    // ==========================================================================

    #[test]
    fn test_action_type_all_variants_serialize_to_camel_case() {
        let variants = [
            (ActionType::Keyboard, "\"keyboard\""),
            (ActionType::Media, "\"media\""),
            (ActionType::Launch, "\"launch\""),
            (ActionType::Script, "\"script\""),
            (ActionType::Http, "\"http\""),
            (ActionType::System, "\"system\""),
            (ActionType::Text, "\"text\""),
            (ActionType::Profile, "\"profile\""),
            (ActionType::HomeAssistant, "\"homeAssistant\""),
            (ActionType::NodeRed, "\"nodeRed\""),
        ];
        for (action_type, expected) in variants {
            let json = serde_json::to_string(&action_type).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_action_type_deserializes() {
        let at: ActionType = serde_json::from_str("\"keyboard\"").unwrap();
        assert_eq!(at, ActionType::Keyboard);
    }

    #[test]
    fn test_action_type_equality() {
        assert_eq!(ActionType::Keyboard, ActionType::Keyboard);
        assert_ne!(ActionType::Keyboard, ActionType::Media);
    }

    // ==========================================================================
    // KeyboardAction Tests
    // ==========================================================================

    #[test]
    fn test_keyboard_action_serializes() {
        let action = KeyboardAction {
            key: "a".to_string(),
            modifiers: vec!["ctrl".to_string(), "shift".to_string()],
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"key\":\"a\""));
        assert!(json.contains("\"modifiers\":[\"ctrl\",\"shift\"]"));
    }

    #[test]
    fn test_keyboard_action_empty_modifiers_default() {
        let json = r#"{"key":"enter"}"#;
        let action: KeyboardAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.key, "enter");
        assert!(action.modifiers.is_empty());
    }

    // ==========================================================================
    // MediaAction Tests
    // ==========================================================================

    #[test]
    fn test_media_action_type_all_variants_serialize() {
        let variants = [
            (MediaActionType::PlayPause, "\"playPause\""),
            (MediaActionType::NextTrack, "\"nextTrack\""),
            (MediaActionType::PreviousTrack, "\"previousTrack\""),
            (MediaActionType::VolumeUp, "\"volumeUp\""),
            (MediaActionType::VolumeDown, "\"volumeDown\""),
            (MediaActionType::VolumeMute, "\"volumeMute\""),
            (MediaActionType::Stop, "\"stop\""),
        ];
        for (action_type, expected) in variants {
            let json = serde_json::to_string(&action_type).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_media_action_serializes() {
        let action = MediaAction {
            action: MediaActionType::PlayPause,
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"action\":\"playPause\""));
    }

    // ==========================================================================
    // LaunchAction Tests
    // ==========================================================================

    #[test]
    fn test_launch_action_serializes() {
        let action = LaunchAction {
            path: "/usr/bin/code".to_string(),
            args: vec!["--new-window".to_string()],
            working_directory: Some("/home/user".to_string()),
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"path\":\"/usr/bin/code\""));
        assert!(json.contains("\"args\":[\"--new-window\"]"));
        assert!(json.contains("\"workingDirectory\":\"/home/user\""));
    }

    #[test]
    fn test_launch_action_defaults() {
        let json = r#"{"path":"notepad.exe"}"#;
        let action: LaunchAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.path, "notepad.exe");
        assert!(action.args.is_empty());
        assert!(action.working_directory.is_none());
    }

    // ==========================================================================
    // ScriptAction Tests
    // ==========================================================================

    #[test]
    fn test_script_type_all_variants_serialize() {
        let variants = [
            (ScriptType::PowerShell, "\"powerShell\""),
            (ScriptType::Bash, "\"bash\""),
            (ScriptType::Cmd, "\"cmd\""),
            (ScriptType::File, "\"file\""),
        ];
        for (script_type, expected) in variants {
            let json = serde_json::to_string(&script_type).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_script_action_serializes() {
        let action = ScriptAction {
            script_type: ScriptType::PowerShell,
            content: "Get-Process".to_string(),
            timeout_ms: Some(5000),
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"scriptType\":\"powerShell\""));
        assert!(json.contains("\"content\":\"Get-Process\""));
        assert!(json.contains("\"timeoutMs\":5000"));
    }

    // ==========================================================================
    // HttpAction Tests
    // ==========================================================================

    #[test]
    fn test_http_method_all_variants_serialize_uppercase() {
        let variants = [
            (HttpMethod::Get, "\"GET\""),
            (HttpMethod::Post, "\"POST\""),
            (HttpMethod::Put, "\"PUT\""),
            (HttpMethod::Delete, "\"DELETE\""),
            (HttpMethod::Patch, "\"PATCH\""),
        ];
        for (method, expected) in variants {
            let json = serde_json::to_string(&method).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_http_method_display() {
        assert_eq!(HttpMethod::Get.to_string(), "GET");
        assert_eq!(HttpMethod::Post.to_string(), "POST");
        assert_eq!(HttpMethod::Put.to_string(), "PUT");
        assert_eq!(HttpMethod::Delete.to_string(), "DELETE");
        assert_eq!(HttpMethod::Patch.to_string(), "PATCH");
    }

    #[test]
    fn test_http_action_serializes() {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        let action = HttpAction {
            method: HttpMethod::Post,
            url: "https://api.example.com/data".to_string(),
            headers,
            body: Some(r#"{"key":"value"}"#.to_string()),
            timeout_ms: Some(10000),
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"method\":\"POST\""));
        assert!(json.contains("\"url\":\"https://api.example.com/data\""));
        assert!(json.contains("\"timeoutMs\":10000"));
    }

    #[test]
    fn test_http_action_defaults() {
        let json = r#"{"method":"GET","url":"https://example.com"}"#;
        let action: HttpAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.method, HttpMethod::Get);
        assert!(action.headers.is_empty());
        assert!(action.body.is_none());
        assert!(action.timeout_ms.is_none());
    }

    // ==========================================================================
    // SystemAction Tests
    // ==========================================================================

    #[test]
    fn test_system_action_type_serializes_snake_case() {
        let variants = [
            (SystemActionType::SwitchDesktopLeft, "\"switch_desktop_left\""),
            (SystemActionType::SwitchDesktopRight, "\"switch_desktop_right\""),
            (SystemActionType::ShowDesktop, "\"show_desktop\""),
            (SystemActionType::LockScreen, "\"lock_screen\""),
            (SystemActionType::Screenshot, "\"screenshot\""),
            (SystemActionType::StartMenu, "\"start_menu\""),
            (SystemActionType::TaskView, "\"task_view\""),
            (SystemActionType::Sleep, "\"sleep\""),
            (SystemActionType::Hibernate, "\"hibernate\""),
        ];
        for (action_type, expected) in variants {
            let json = serde_json::to_string(&action_type).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_system_action_lock_alias() {
        // "lock" is an alias for "lock_screen"
        let sat: SystemActionType = serde_json::from_str("\"lock\"").unwrap();
        assert_eq!(sat, SystemActionType::LockScreen);
    }

    // ==========================================================================
    // TextAction Tests
    // ==========================================================================

    #[test]
    fn test_text_action_serializes() {
        let action = TextAction {
            text: "Hello, World!".to_string(),
            delay_ms: Some(50),
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"text\":\"Hello, World!\""));
        assert!(json.contains("\"delayMs\":50"));
    }

    #[test]
    fn test_text_action_defaults() {
        let json = r#"{"text":"test"}"#;
        let action: TextAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.text, "test");
        assert!(action.delay_ms.is_none());
    }

    // ==========================================================================
    // ProfileAction Tests
    // ==========================================================================

    #[test]
    fn test_profile_action_by_id() {
        let action = ProfileAction {
            profile_id: Some("uuid-123".to_string()),
            profile_name: None,
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"profileId\":\"uuid-123\""));
    }

    #[test]
    fn test_profile_action_by_name() {
        let action = ProfileAction {
            profile_id: None,
            profile_name: Some("Gaming".to_string()),
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"profileName\":\"Gaming\""));
    }

    // ==========================================================================
    // HomeAssistantAction Tests
    // ==========================================================================

    #[test]
    fn test_home_assistant_action_type_all_variants() {
        let variants = [
            (HomeAssistantActionType::CallService, "\"callService\""),
            (HomeAssistantActionType::Toggle, "\"toggle\""),
            (HomeAssistantActionType::TurnOn, "\"turnOn\""),
            (HomeAssistantActionType::TurnOff, "\"turnOff\""),
            (HomeAssistantActionType::FireEvent, "\"fireEvent\""),
        ];
        for (action_type, expected) in variants {
            let json = serde_json::to_string(&action_type).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_home_assistant_action_serializes() {
        let action = HomeAssistantAction {
            action_type: HomeAssistantActionType::Toggle,
            entity_id: "light.living_room".to_string(),
            service: None,
            service_data: None,
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"actionType\":\"toggle\""));
        assert!(json.contains("\"entityId\":\"light.living_room\""));
    }

    // ==========================================================================
    // NodeRedAction Tests
    // ==========================================================================

    #[test]
    fn test_node_red_action_serializes() {
        let action = NodeRedAction {
            flow_id: "flow-123".to_string(),
            payload: Some(serde_json::json!({"message": "hello"})),
        };
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"flowId\":\"flow-123\""));
        assert!(json.contains("\"payload\":{\"message\":\"hello\"}"));
    }

    #[test]
    fn test_node_red_action_defaults() {
        let json = r#"{"flowId":"test"}"#;
        let action: NodeRedAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.flow_id, "test");
        assert!(action.payload.is_none());
    }

    // ==========================================================================
    // Action (tagged enum) Tests
    // ==========================================================================

    #[test]
    fn test_action_keyboard_serializes_with_tag() {
        let action = Action::Keyboard(KeyboardAction {
            key: "space".to_string(),
            modifiers: vec![],
        });
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"type\":\"keyboard\""));
        assert!(json.contains("\"key\":\"space\""));
    }

    #[test]
    fn test_action_media_serializes_with_tag() {
        let action = Action::Media(MediaAction {
            action: MediaActionType::PlayPause,
        });
        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains("\"type\":\"media\""));
    }

    #[test]
    fn test_action_deserializes_from_tagged_json() {
        let json = r#"{"type":"text","text":"hello"}"#;
        let action: Action = serde_json::from_str(json).unwrap();
        match action {
            Action::Text(ta) => assert_eq!(ta.text, "hello"),
            _ => panic!("Expected Text action"),
        }
    }

    #[test]
    fn test_action_http_deserializes() {
        let json = r#"{"type":"http","method":"POST","url":"https://example.com"}"#;
        let action: Action = serde_json::from_str(json).unwrap();
        match action {
            Action::Http(ha) => {
                assert_eq!(ha.method, HttpMethod::Post);
                assert_eq!(ha.url, "https://example.com");
            }
            _ => panic!("Expected Http action"),
        }
    }

    #[test]
    fn test_action_clone() {
        let action = Action::Launch(LaunchAction {
            path: "notepad.exe".to_string(),
            args: vec![],
            working_directory: None,
        });
        let cloned = action.clone();
        if let Action::Launch(la) = cloned {
            assert_eq!(la.path, "notepad.exe");
        } else {
            panic!("Clone failed");
        }
    }

    // ==========================================================================
    // ActionResult Tests
    // ==========================================================================

    #[test]
    fn test_action_result_success() {
        let result = ActionResult::success(100);
        assert!(result.success);
        assert!(result.message.is_none());
        assert!(result.error.is_none());
        assert_eq!(result.duration_ms, 100);
    }

    #[test]
    fn test_action_result_success_with_message() {
        let result = ActionResult::success_with_message("Done".to_string(), 50);
        assert!(result.success);
        assert_eq!(result.message, Some("Done".to_string()));
        assert!(result.error.is_none());
        assert_eq!(result.duration_ms, 50);
    }

    #[test]
    fn test_action_result_failure() {
        let result = ActionResult::failure("Something went wrong".to_string(), 200);
        assert!(!result.success);
        assert!(result.message.is_none());
        assert_eq!(result.error, Some("Something went wrong".to_string()));
        assert_eq!(result.duration_ms, 200);
    }

    #[test]
    fn test_action_result_serializes_to_camel_case() {
        let result = ActionResult::success_with_message("OK".to_string(), 10);
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"durationMs\":10"));
    }
}
