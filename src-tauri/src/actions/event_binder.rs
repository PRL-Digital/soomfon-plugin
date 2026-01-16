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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actions::types::{Action, KeyboardAction, MediaAction, MediaActionType};
    use crate::config::types::{ButtonConfig, EncoderConfig, Profile};
    use crate::hid::types::{ButtonEventType, EncoderEventType, DeviceEvent};
    use std::collections::HashMap;

    /// Create a test profile with specific button and encoder configurations
    fn create_test_profile() -> Profile {
        let mut buttons = vec![ButtonConfig::default(); 6];
        let mut encoders = vec![EncoderConfig::default(); 2];

        // Configure button 0 with press action
        let mut button0_actions = HashMap::new();
        button0_actions.insert(
            ButtonTrigger::Press,
            Action::Keyboard(KeyboardAction {
                key: "A".to_string(),
                modifiers: vec![],
            }),
        );
        button0_actions.insert(
            ButtonTrigger::Release,
            Action::Keyboard(KeyboardAction {
                key: "B".to_string(),
                modifiers: vec![],
            }),
        );
        button0_actions.insert(
            ButtonTrigger::LongPress,
            Action::Keyboard(KeyboardAction {
                key: "C".to_string(),
                modifiers: vec!["ctrl".to_string()],
            }),
        );
        buttons[0].actions = button0_actions;

        // Configure button 2 with only press action
        let mut button2_actions = HashMap::new();
        button2_actions.insert(
            ButtonTrigger::Press,
            Action::Media(MediaAction {
                action: MediaActionType::PlayPause,
            }),
        );
        buttons[2].actions = button2_actions;

        // Configure encoder 0 with rotation actions
        let mut encoder0_actions = HashMap::new();
        encoder0_actions.insert(
            EncoderTrigger::RotateCW,
            Action::Media(MediaAction {
                action: MediaActionType::VolumeUp,
            }),
        );
        encoder0_actions.insert(
            EncoderTrigger::RotateCCW,
            Action::Media(MediaAction {
                action: MediaActionType::VolumeDown,
            }),
        );
        encoder0_actions.insert(
            EncoderTrigger::Press,
            Action::Media(MediaAction {
                action: MediaActionType::VolumeMute,
            }),
        );
        encoders[0].actions = encoder0_actions;

        // Configure encoder 1 with long press
        let mut encoder1_actions = HashMap::new();
        encoder1_actions.insert(
            EncoderTrigger::LongPress,
            Action::Media(MediaAction {
                action: MediaActionType::Stop,
            }),
        );
        encoders[1].actions = encoder1_actions;

        Profile {
            id: "test-profile-id".to_string(),
            name: "Test Profile".to_string(),
            description: Some("A test profile".to_string()),
            buttons,
            encoders,
            created_at: 1700000000000,
            updated_at: 1700000000000,
        }
    }

    // ========== EventBinder Creation Tests ==========

    #[test]
    fn test_new_creates_binder_without_profile() {
        let binder = EventBinder::new();
        assert!(!binder.has_profile());
        assert!(binder.get_profile_name().is_none());
    }

    #[test]
    fn test_default_creates_binder_without_profile() {
        let binder = EventBinder::default();
        assert!(!binder.has_profile());
    }

    // ========== Profile Binding Tests ==========

    #[test]
    fn test_bind_profile_sets_profile() {
        let mut binder = EventBinder::new();
        let profile = create_test_profile();

        binder.bind_profile(profile);

        assert!(binder.has_profile());
        assert_eq!(binder.get_profile_name(), Some("Test Profile"));
    }

    #[test]
    fn test_bind_profile_replaces_existing() {
        let mut binder = EventBinder::new();

        let profile1 = create_test_profile();
        let mut profile2 = create_test_profile();
        profile2.name = "Second Profile".to_string();

        binder.bind_profile(profile1);
        assert_eq!(binder.get_profile_name(), Some("Test Profile"));

        binder.bind_profile(profile2);
        assert_eq!(binder.get_profile_name(), Some("Second Profile"));
    }

    #[test]
    fn test_unbind_removes_profile() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        assert!(binder.has_profile());

        binder.unbind();

        assert!(!binder.has_profile());
        assert!(binder.get_profile_name().is_none());
    }

    #[test]
    fn test_unbind_when_no_profile_is_safe() {
        let mut binder = EventBinder::new();
        binder.unbind(); // Should not panic
        assert!(!binder.has_profile());
    }

    // ========== Button Event Routing Tests ==========

    #[test]
    fn test_button_press_returns_correct_action() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        let event = DeviceEvent::Button {
            index: 0,
            event_type: ButtonEventType::Press,
        };

        let action = binder.get_action_for_event(&event);
        assert!(action.is_some());

        match action.unwrap() {
            Action::Keyboard(ka) => {
                assert_eq!(ka.key, "A");
                assert!(ka.modifiers.is_empty());
            }
            _ => panic!("Expected Keyboard action"),
        }
    }

    #[test]
    fn test_button_release_returns_correct_action() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        let event = DeviceEvent::Button {
            index: 0,
            event_type: ButtonEventType::Release,
        };

        let action = binder.get_action_for_event(&event);
        assert!(action.is_some());

        match action.unwrap() {
            Action::Keyboard(ka) => {
                assert_eq!(ka.key, "B");
            }
            _ => panic!("Expected Keyboard action"),
        }
    }

    #[test]
    fn test_button_long_press_returns_correct_action() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        let event = DeviceEvent::Button {
            index: 0,
            event_type: ButtonEventType::LongPress,
        };

        let action = binder.get_action_for_event(&event);
        assert!(action.is_some());

        match action.unwrap() {
            Action::Keyboard(ka) => {
                assert_eq!(ka.key, "C");
                assert_eq!(ka.modifiers, vec!["ctrl".to_string()]);
            }
            _ => panic!("Expected Keyboard action"),
        }
    }

    #[test]
    fn test_button_press_on_different_button() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        let event = DeviceEvent::Button {
            index: 2,
            event_type: ButtonEventType::Press,
        };

        let action = binder.get_action_for_event(&event);
        assert!(action.is_some());

        match action.unwrap() {
            Action::Media(ma) => {
                assert_eq!(ma.action, MediaActionType::PlayPause);
            }
            _ => panic!("Expected Media action"),
        }
    }

    #[test]
    fn test_button_event_with_no_action_returns_none() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        // Button 1 has no actions configured
        let event = DeviceEvent::Button {
            index: 1,
            event_type: ButtonEventType::Press,
        };

        assert!(binder.get_action_for_event(&event).is_none());
    }

    #[test]
    fn test_button_release_with_no_action_returns_none() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        // Button 2 only has press, not release
        let event = DeviceEvent::Button {
            index: 2,
            event_type: ButtonEventType::Release,
        };

        assert!(binder.get_action_for_event(&event).is_none());
    }

    #[test]
    fn test_button_index_out_of_range_returns_none() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        // Index 10 is beyond the 6 configured buttons
        let event = DeviceEvent::Button {
            index: 10,
            event_type: ButtonEventType::Press,
        };

        assert!(binder.get_action_for_event(&event).is_none());
    }

    // ========== Encoder Event Routing Tests ==========

    #[test]
    fn test_encoder_rotate_cw_returns_correct_action() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        let event = DeviceEvent::Encoder {
            index: 0,
            event_type: EncoderEventType::RotateCW,
        };

        let action = binder.get_action_for_event(&event);
        assert!(action.is_some());

        match action.unwrap() {
            Action::Media(ma) => {
                assert_eq!(ma.action, MediaActionType::VolumeUp);
            }
            _ => panic!("Expected Media action"),
        }
    }

    #[test]
    fn test_encoder_rotate_ccw_returns_correct_action() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        let event = DeviceEvent::Encoder {
            index: 0,
            event_type: EncoderEventType::RotateCCW,
        };

        let action = binder.get_action_for_event(&event);
        assert!(action.is_some());

        match action.unwrap() {
            Action::Media(ma) => {
                assert_eq!(ma.action, MediaActionType::VolumeDown);
            }
            _ => panic!("Expected Media action"),
        }
    }

    #[test]
    fn test_encoder_press_returns_correct_action() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        let event = DeviceEvent::Encoder {
            index: 0,
            event_type: EncoderEventType::Press,
        };

        let action = binder.get_action_for_event(&event);
        assert!(action.is_some());

        match action.unwrap() {
            Action::Media(ma) => {
                assert_eq!(ma.action, MediaActionType::VolumeMute);
            }
            _ => panic!("Expected Media action"),
        }
    }

    #[test]
    fn test_encoder_long_press_returns_correct_action() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        let event = DeviceEvent::Encoder {
            index: 1,
            event_type: EncoderEventType::LongPress,
        };

        let action = binder.get_action_for_event(&event);
        assert!(action.is_some());

        match action.unwrap() {
            Action::Media(ma) => {
                assert_eq!(ma.action, MediaActionType::Stop);
            }
            _ => panic!("Expected Media action"),
        }
    }

    #[test]
    fn test_encoder_release_with_no_action_returns_none() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        // Encoder 0 has no release action
        let event = DeviceEvent::Encoder {
            index: 0,
            event_type: EncoderEventType::Release,
        };

        assert!(binder.get_action_for_event(&event).is_none());
    }

    #[test]
    fn test_encoder_index_out_of_range_returns_none() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        // Index 5 is beyond the 2 configured encoders
        let event = DeviceEvent::Encoder {
            index: 5,
            event_type: EncoderEventType::RotateCW,
        };

        assert!(binder.get_action_for_event(&event).is_none());
    }

    // ========== No Profile Bound Tests ==========

    #[test]
    fn test_button_event_without_profile_returns_none() {
        let binder = EventBinder::new();

        let event = DeviceEvent::Button {
            index: 0,
            event_type: ButtonEventType::Press,
        };

        assert!(binder.get_action_for_event(&event).is_none());
    }

    #[test]
    fn test_encoder_event_without_profile_returns_none() {
        let binder = EventBinder::new();

        let event = DeviceEvent::Encoder {
            index: 0,
            event_type: EncoderEventType::RotateCW,
        };

        assert!(binder.get_action_for_event(&event).is_none());
    }

    // ========== Profile Lifecycle Tests ==========

    #[test]
    fn test_events_return_none_after_unbind() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        // Verify action exists
        let event = DeviceEvent::Button {
            index: 0,
            event_type: ButtonEventType::Press,
        };
        assert!(binder.get_action_for_event(&event).is_some());

        // Unbind and verify no action
        binder.unbind();
        assert!(binder.get_action_for_event(&event).is_none());
    }

    #[test]
    fn test_rebind_profile_updates_actions() {
        let mut binder = EventBinder::new();
        binder.bind_profile(create_test_profile());

        // Create a different profile with different action
        let mut new_profile = Profile::new("New Profile".to_string());
        let mut new_button_actions = HashMap::new();
        new_button_actions.insert(
            ButtonTrigger::Press,
            Action::Media(MediaAction {
                action: MediaActionType::NextTrack,
            }),
        );
        new_profile.buttons[0].actions = new_button_actions;

        binder.bind_profile(new_profile);

        let event = DeviceEvent::Button {
            index: 0,
            event_type: ButtonEventType::Press,
        };

        match binder.get_action_for_event(&event).unwrap() {
            Action::Media(ma) => {
                assert_eq!(ma.action, MediaActionType::NextTrack);
            }
            _ => panic!("Expected Media action after rebind"),
        }
    }
}
