//! Event Binder
//!
//! Routes device events to their configured actions based on the active profile.

use super::types::Action;
use crate::config::types::{Profile, ButtonTrigger, EncoderTrigger};
use crate::hid::types::DeviceEvent;

/// Maps device events to actions based on profile configuration
pub struct EventBinder {
    /// Currently bound profile
    profile: Option<Profile>,
}

impl EventBinder {
    /// Create a new event binder
    pub fn new() -> Self {
        Self { profile: None }
    }

    /// Bind a profile for event routing
    pub fn bind_profile(&mut self, profile: Profile) {
        log::info!("Binding profile: {}", profile.name);
        self.profile = Some(profile);
    }

    /// Unbind the current profile
    pub fn unbind(&mut self) {
        log::info!("Unbinding profile");
        self.profile = None;
    }

    /// Get the action for a device event
    pub fn get_action_for_event(&self, event: &DeviceEvent) -> Option<Action> {
        let profile = self.profile.as_ref()?;

        match event {
            DeviceEvent::Button { index, event_type } => {
                let button_config = profile.buttons.get(*index as usize)?;

                let trigger = match event_type {
                    crate::hid::types::ButtonEventType::Press => ButtonTrigger::Press,
                    crate::hid::types::ButtonEventType::Release => ButtonTrigger::Release,
                    crate::hid::types::ButtonEventType::LongPress => ButtonTrigger::LongPress,
                };

                button_config.actions.get(&trigger).cloned()
            }
            DeviceEvent::Encoder { index, event_type } => {
                let encoder_config = profile.encoders.get(*index as usize)?;

                let trigger = match event_type {
                    crate::hid::types::EncoderEventType::RotateCW => EncoderTrigger::RotateCW,
                    crate::hid::types::EncoderEventType::RotateCCW => EncoderTrigger::RotateCCW,
                    crate::hid::types::EncoderEventType::Press => EncoderTrigger::Press,
                    crate::hid::types::EncoderEventType::Release => EncoderTrigger::Release,
                    crate::hid::types::EncoderEventType::LongPress => EncoderTrigger::LongPress,
                };

                encoder_config.actions.get(&trigger).cloned()
            }
        }
    }

    /// Check if a profile is currently bound
    pub fn has_profile(&self) -> bool {
        self.profile.is_some()
    }

    /// Get the currently bound profile name
    pub fn get_profile_name(&self) -> Option<&str> {
        self.profile.as_ref().map(|p| p.name.as_str())
    }
}

impl Default for EventBinder {
    fn default() -> Self {
        Self::new()
    }
}
