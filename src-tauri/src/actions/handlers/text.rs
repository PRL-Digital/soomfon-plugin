//! Text Handler
//!
//! Types text using keyboard simulation with Unicode support.
//! On Windows, uses SendInput with KEYEVENTF_UNICODE flag.

use crate::actions::types::{ActionResult, TextAction};

/// Execute a text typing action
pub async fn execute(config: &TextAction) -> ActionResult {
    log::debug!("Executing text action: {} chars", config.text.len());

    #[cfg(target_os = "windows")]
    {
        execute_windows(config).await
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = config;
        ActionResult::failure("Text actions only supported on Windows".to_string(), 0)
    }
}

#[cfg(target_os = "windows")]
async fn execute_windows(config: &TextAction) -> ActionResult {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    let delay_ms = config.delay_ms.unwrap_or(0);

    // Type each character
    for c in config.text.chars() {
        if let Err(e) = send_unicode_char(c) {
            return ActionResult::failure(e, 0);
        }

        // Add delay between characters if specified
        if delay_ms > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
        }
    }

    ActionResult::success(0)
}

/// Send a single Unicode character using SendInput
#[cfg(target_os = "windows")]
fn send_unicode_char(c: char) -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    // Handle newline specially - send Enter key
    if c == '\n' {
        return send_key_press(VK_RETURN);
    }

    // Handle tab specially
    if c == '\t' {
        return send_key_press(VK_TAB);
    }

    // For regular characters, use Unicode input
    let mut inputs = Vec::new();

    // UTF-16 encode the character (handles surrogate pairs for emoji etc.)
    let mut utf16_buf = [0u16; 2];
    let utf16 = c.encode_utf16(&mut utf16_buf);

    for &code_unit in utf16 {
        // Key down
        inputs.push(INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: code_unit,
                    dwFlags: KEYEVENTF_UNICODE,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        });

        // Key up
        inputs.push(INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: code_unit,
                    dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        });
    }

    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };

    if sent as usize != inputs.len() {
        return Err(format!(
            "SendInput failed for char '{}': sent {} of {} inputs",
            c,
            sent,
            inputs.len()
        ));
    }

    Ok(())
}

/// Send a virtual key press (key down + key up)
#[cfg(target_os = "windows")]
fn send_key_press(vk: VIRTUAL_KEY) -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

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

    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };

    if sent != 2 {
        return Err(format!("SendInput failed: sent {} of 2 inputs", sent));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY;
