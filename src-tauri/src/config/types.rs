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

/// Workspace containing button and encoder configurations
/// Workspaces allow quick switching between different configurations within a profile
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    /// Unique workspace ID
    pub id: String,
    /// Workspace display name
    pub name: String,
    /// Button configurations (6 LCD buttons)
    #[serde(default)]
    pub buttons: Vec<ButtonConfig>,
    /// Encoder configurations (2 encoders)
    #[serde(default)]
    pub encoders: Vec<EncoderConfig>,
}

impl Workspace {
    /// Create a new empty workspace
    pub fn new(name: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            buttons: vec![],
            encoders: vec![],
        }
    }
}

impl Default for Workspace {
    fn default() -> Self {
        Self::new("Workspace 1".to_string())
    }
}

/// Device profile containing workspaces with button and encoder configurations
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
    /// Workspaces containing button/encoder configurations
    #[serde(default = "default_workspaces")]
    pub workspaces: Vec<Workspace>,
    /// Index of the currently active workspace (0-based)
    #[serde(default)]
    pub active_workspace_index: usize,
    /// Creation timestamp
    pub created_at: u64,
    /// Last modified timestamp
    pub updated_at: u64,
    /// Legacy button configurations (deprecated, for backward compatibility)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub buttons: Vec<ButtonConfig>,
    /// Legacy encoder configurations (deprecated, for backward compatibility)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub encoders: Vec<EncoderConfig>,
}

fn default_workspaces() -> Vec<Workspace> {
    vec![Workspace::default()]
}

impl Profile {
    /// Create a new empty profile with one default workspace
    pub fn new(name: String) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description: None,
            workspaces: vec![Workspace::default()],
            active_workspace_index: 0,
            created_at: now,
            updated_at: now,
            buttons: vec![],
            encoders: vec![],
        }
    }

    /// Get the currently active workspace
    pub fn active_workspace(&self) -> Option<&Workspace> {
        self.workspaces.get(self.active_workspace_index)
    }

    /// Get the currently active workspace mutably
    pub fn active_workspace_mut(&mut self) -> Option<&mut Workspace> {
        self.workspaces.get_mut(self.active_workspace_index)
    }

    /// Migrate legacy buttons/encoders to workspace format
    pub fn migrate_legacy_config(&mut self) {
        if !self.buttons.is_empty() || !self.encoders.is_empty() {
            if self.workspaces.is_empty() {
                self.workspaces.push(Workspace::default());
            }
            if let Some(workspace) = self.workspaces.get_mut(0) {
                if workspace.buttons.is_empty() {
                    workspace.buttons = std::mem::take(&mut self.buttons);
                }
                if workspace.encoders.is_empty() {
                    workspace.encoders = std::mem::take(&mut self.encoders);
                }
            }
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
    pub workspaces: Option<Vec<Workspace>>,
    #[serde(default)]
    pub active_workspace_index: Option<usize>,
    /// Legacy field for backward compatibility
    #[serde(default)]
    pub buttons: Option<Vec<ButtonConfig>>,
    /// Legacy field for backward compatibility
    #[serde(default)]
    pub encoders: Option<Vec<EncoderConfig>>,
}

/// Workspace update request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceUpdate {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub buttons: Option<Vec<ButtonConfig>>,
    #[serde(default)]
    pub encoders: Option<Vec<EncoderConfig>>,
}
