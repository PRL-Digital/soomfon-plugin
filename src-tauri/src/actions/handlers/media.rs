//! Media Handler
//!
//! Simulates media key input for play/pause, volume, track navigation.
//! Uses the same Windows SendInput API as the keyboard handler.

use crate::actions::types::{ActionResult, MediaAction};
#[cfg(target_os = "windows")]
use crate::actions::types::MediaActionType;

/// Execute a media action
pub async fn execute(config: &MediaAction) -> ActionResult {
    log::debug!("Executing media action: {:?}", config.action);

    #[cfg(target_os = "windows")]
    {
        execute_windows(config)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = config;
        ActionResult::failure("Media actions only supported on Windows".to_string(), 0)
    }
}

#[cfg(target_os = "windows")]
fn execute_windows(config: &MediaAction) -> ActionResult {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    // Map media action to virtual key code
    let vk = match config.action {
        MediaActionType::PlayPause => VK_MEDIA_PLAY_PAUSE,
        MediaActionType::NextTrack => VK_MEDIA_NEXT_TRACK,
        MediaActionType::PreviousTrack => VK_MEDIA_PREV_TRACK,
        MediaActionType::VolumeUp => VK_VOLUME_UP,
        MediaActionType::VolumeDown => VK_VOLUME_DOWN,
        MediaActionType::VolumeMute => VK_VOLUME_MUTE,
        MediaActionType::Stop => VK_MEDIA_STOP,
    };

    // Send the media key
    match send_media_key(vk) {
        Ok(()) => ActionResult::success(0),
        Err(e) => ActionResult::failure(e, 0),
    }
}

/// Send a single media key press
#[cfg(target_os = "windows")]
fn send_media_key(vk: VIRTUAL_KEY) -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    // Create key down and key up inputs
    let inputs = [
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        },
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        },
    ];

    // Send both inputs
    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };

    if sent != 2 {
        return Err(format!("SendInput failed: sent {} of 2 inputs", sent));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY;
