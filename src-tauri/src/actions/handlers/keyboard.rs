//! Keyboard Handler
//!
//! Simulates keyboard input using platform-specific APIs.
//! On Windows, uses SendInput from Win32 API.

use crate::actions::types::{ActionResult, KeyboardAction};

#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::INPUT;

/// Execute a keyboard action
pub async fn execute(config: &KeyboardAction) -> ActionResult {
    log::debug!("Executing keyboard action: key={}, modifiers={:?}", config.keys, config.modifiers);

    #[cfg(target_os = "windows")]
    {
        execute_windows(config)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = config;
        ActionResult::failure("Keyboard actions only supported on Windows".to_string(), 0)
    }
}

#[cfg(target_os = "windows")]
fn execute_windows(config: &KeyboardAction) -> ActionResult {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    // Parse the key to a virtual key code
    let vk = match parse_key(&config.keys) {
        Some(vk) => vk,
        None => return ActionResult::failure(format!("Unknown key: {}", config.keys), 0),
    };

    // Parse modifiers
    let modifier_vks: Vec<VIRTUAL_KEY> = config
        .modifiers
        .iter()
        .filter_map(|m| parse_modifier(m))
        .collect();

    // Execute the key press
    match send_key_combination(&modifier_vks, vk) {
        Ok(()) => ActionResult::success(0),
        Err(e) => ActionResult::failure(e, 0),
    }
}

/// Send a key combination (modifiers + key)
#[cfg(target_os = "windows")]
fn send_key_combination(modifiers: &[VIRTUAL_KEY], key: VIRTUAL_KEY) -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    // Build input array: modifier presses + key press + key release + modifier releases
    let mut inputs: Vec<INPUT> = Vec::new();

    // Press modifiers
    for &vk in modifiers {
        inputs.push(create_key_input(vk, false));
    }

    // Press and release the main key
    inputs.push(create_key_input(key, false));
    inputs.push(create_key_input(key, true));

    // Release modifiers in reverse order
    for &vk in modifiers.iter().rev() {
        inputs.push(create_key_input(vk, true));
    }

    // Send all inputs
    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };

    if sent as usize != inputs.len() {
        return Err(format!(
            "SendInput failed: sent {} of {} inputs",
            sent,
            inputs.len()
        ));
    }

    Ok(())
}

/// Create a keyboard INPUT structure
#[cfg(target_os = "windows")]
fn create_key_input(vk: VIRTUAL_KEY, key_up: bool) -> INPUT {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    let mut flags = KEYBD_EVENT_FLAGS(0);
    if key_up {
        flags |= KEYEVENTF_KEYUP;
    }

    // Handle extended keys (arrows, home, end, insert, delete, numpad, etc.)
    if is_extended_key(vk) {
        flags |= KEYEVENTF_EXTENDEDKEY;
    }

    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

/// Check if a virtual key code is an extended key
#[cfg(target_os = "windows")]
fn is_extended_key(vk: VIRTUAL_KEY) -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    matches!(
        vk,
        VK_UP | VK_DOWN | VK_LEFT | VK_RIGHT |
        VK_HOME | VK_END | VK_PRIOR | VK_NEXT |
        VK_INSERT | VK_DELETE |
        VK_NUMLOCK | VK_RCONTROL | VK_RMENU |
        VK_LWIN | VK_RWIN | VK_APPS |
        VK_DIVIDE
    )
}

/// Parse a modifier string to a virtual key code
#[cfg(target_os = "windows")]
fn parse_modifier(modifier: &str) -> Option<VIRTUAL_KEY> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    match modifier.to_lowercase().as_str() {
        "ctrl" | "control" | "lctrl" => Some(VK_LCONTROL),
        "rctrl" => Some(VK_RCONTROL),
        "alt" | "lalt" => Some(VK_LMENU),
        "ralt" => Some(VK_RMENU),
        "shift" | "lshift" => Some(VK_LSHIFT),
        "rshift" => Some(VK_RSHIFT),
        "win" | "windows" | "super" | "meta" | "cmd" | "lwin" => Some(VK_LWIN),
        "rwin" => Some(VK_RWIN),
        _ => None,
    }
}

/// Parse a key string to a virtual key code
#[cfg(target_os = "windows")]
fn parse_key(key: &str) -> Option<VIRTUAL_KEY> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    let key_lower = key.to_lowercase();
    let key_str = key_lower.as_str();

    // Try single character first
    if key.len() == 1 {
        let c = key.chars().next().unwrap();
        if let Some(vk) = char_to_vk(c) {
            return Some(vk);
        }
    }

    // Named keys
    match key_str {
        // Letters (for explicit naming)
        "a" => Some(VK_A),
        "b" => Some(VK_B),
        "c" => Some(VK_C),
        "d" => Some(VK_D),
        "e" => Some(VK_E),
        "f" => Some(VK_F),
        "g" => Some(VK_G),
        "h" => Some(VK_H),
        "i" => Some(VK_I),
        "j" => Some(VK_J),
        "k" => Some(VK_K),
        "l" => Some(VK_L),
        "m" => Some(VK_M),
        "n" => Some(VK_N),
        "o" => Some(VK_O),
        "p" => Some(VK_P),
        "q" => Some(VK_Q),
        "r" => Some(VK_R),
        "s" => Some(VK_S),
        "t" => Some(VK_T),
        "u" => Some(VK_U),
        "v" => Some(VK_V),
        "w" => Some(VK_W),
        "x" => Some(VK_X),
        "y" => Some(VK_Y),
        "z" => Some(VK_Z),

        // Numbers
        "0" => Some(VK_0),
        "1" => Some(VK_1),
        "2" => Some(VK_2),
        "3" => Some(VK_3),
        "4" => Some(VK_4),
        "5" => Some(VK_5),
        "6" => Some(VK_6),
        "7" => Some(VK_7),
        "8" => Some(VK_8),
        "9" => Some(VK_9),

        // Function keys
        "f1" => Some(VK_F1),
        "f2" => Some(VK_F2),
        "f3" => Some(VK_F3),
        "f4" => Some(VK_F4),
        "f5" => Some(VK_F5),
        "f6" => Some(VK_F6),
        "f7" => Some(VK_F7),
        "f8" => Some(VK_F8),
        "f9" => Some(VK_F9),
        "f10" => Some(VK_F10),
        "f11" => Some(VK_F11),
        "f12" => Some(VK_F12),
        "f13" => Some(VK_F13),
        "f14" => Some(VK_F14),
        "f15" => Some(VK_F15),
        "f16" => Some(VK_F16),
        "f17" => Some(VK_F17),
        "f18" => Some(VK_F18),
        "f19" => Some(VK_F19),
        "f20" => Some(VK_F20),
        "f21" => Some(VK_F21),
        "f22" => Some(VK_F22),
        "f23" => Some(VK_F23),
        "f24" => Some(VK_F24),

        // Navigation
        "up" | "uparrow" => Some(VK_UP),
        "down" | "downarrow" => Some(VK_DOWN),
        "left" | "leftarrow" => Some(VK_LEFT),
        "right" | "rightarrow" => Some(VK_RIGHT),
        "home" => Some(VK_HOME),
        "end" => Some(VK_END),
        "pageup" | "pgup" | "prior" => Some(VK_PRIOR),
        "pagedown" | "pgdn" | "next" => Some(VK_NEXT),

        // Editing
        "enter" | "return" => Some(VK_RETURN),
        "tab" => Some(VK_TAB),
        "space" | " " => Some(VK_SPACE),
        "backspace" | "back" => Some(VK_BACK),
        "delete" | "del" => Some(VK_DELETE),
        "insert" | "ins" => Some(VK_INSERT),
        "escape" | "esc" => Some(VK_ESCAPE),

        // Modifiers (can also be used as keys)
        "ctrl" | "control" | "lctrl" => Some(VK_LCONTROL),
        "rctrl" => Some(VK_RCONTROL),
        "alt" | "lalt" => Some(VK_LMENU),
        "ralt" => Some(VK_RMENU),
        "shift" | "lshift" => Some(VK_LSHIFT),
        "rshift" => Some(VK_RSHIFT),
        "win" | "windows" | "super" | "meta" | "cmd" | "lwin" => Some(VK_LWIN),
        "rwin" => Some(VK_RWIN),

        // Lock keys
        "capslock" | "caps" => Some(VK_CAPITAL),
        "numlock" | "num" => Some(VK_NUMLOCK),
        "scrolllock" | "scroll" => Some(VK_SCROLL),

        // Special keys
        "pause" | "break" => Some(VK_PAUSE),
        "print" | "printscreen" | "prtsc" => Some(VK_SNAPSHOT),
        "menu" | "apps" | "contextmenu" => Some(VK_APPS),

        // Punctuation
        "grave" | "`" | "backtick" => Some(VK_OEM_3),
        "minus" | "-" => Some(VK_OEM_MINUS),
        "equal" | "=" | "equals" => Some(VK_OEM_PLUS),
        "leftbracket" | "[" | "openbracket" => Some(VK_OEM_4),
        "rightbracket" | "]" | "closebracket" => Some(VK_OEM_6),
        "backslash" | "\\" => Some(VK_OEM_5),
        "semicolon" | ";" => Some(VK_OEM_1),
        "quote" | "'" | "apostrophe" => Some(VK_OEM_7),
        "comma" | "," => Some(VK_OEM_COMMA),
        "period" | "." | "dot" => Some(VK_OEM_PERIOD),
        "slash" | "/" | "forwardslash" => Some(VK_OEM_2),

        // Numpad
        "numpad0" | "num0" => Some(VK_NUMPAD0),
        "numpad1" | "num1" => Some(VK_NUMPAD1),
        "numpad2" | "num2" => Some(VK_NUMPAD2),
        "numpad3" | "num3" => Some(VK_NUMPAD3),
        "numpad4" | "num4" => Some(VK_NUMPAD4),
        "numpad5" | "num5" => Some(VK_NUMPAD5),
        "numpad6" | "num6" => Some(VK_NUMPAD6),
        "numpad7" | "num7" => Some(VK_NUMPAD7),
        "numpad8" | "num8" => Some(VK_NUMPAD8),
        "numpad9" | "num9" => Some(VK_NUMPAD9),
        "add" | "numpadplus" | "numpad+" => Some(VK_ADD),
        "subtract" | "numpadminus" | "numpad-" => Some(VK_SUBTRACT),
        "multiply" | "numpadmultiply" | "numpad*" => Some(VK_MULTIPLY),
        "divide" | "numpaddivide" | "numpad/" => Some(VK_DIVIDE),
        "decimal" | "numpaddecimal" | "numpad." => Some(VK_DECIMAL),

        // Media keys
        "mute" | "volumemute" | "audiomute" => Some(VK_VOLUME_MUTE),
        "volumedown" | "voldown" | "audiovoldown" => Some(VK_VOLUME_DOWN),
        "volumeup" | "volup" | "audiovolup" => Some(VK_VOLUME_UP),
        "playpause" | "play" | "mediaplaypause" => Some(VK_MEDIA_PLAY_PAUSE),
        "stop" | "mediastop" => Some(VK_MEDIA_STOP),
        "nexttrack" | "medianext" => Some(VK_MEDIA_NEXT_TRACK),
        "previoustrack" | "prev" | "previous" | "mediaprev" => Some(VK_MEDIA_PREV_TRACK),

        // Browser keys
        "browserback" => Some(VK_BROWSER_BACK),
        "browserforward" => Some(VK_BROWSER_FORWARD),
        "browserrefresh" => Some(VK_BROWSER_REFRESH),
        "browserstop" => Some(VK_BROWSER_STOP),
        "browsersearch" => Some(VK_BROWSER_SEARCH),
        "browserfavorites" => Some(VK_BROWSER_FAVORITES),
        "browserhome" => Some(VK_BROWSER_HOME),

        _ => None,
    }
}

/// Convert a character to a virtual key code
#[cfg(target_os = "windows")]
fn char_to_vk(c: char) -> Option<VIRTUAL_KEY> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    match c.to_ascii_uppercase() {
        'A' => Some(VK_A),
        'B' => Some(VK_B),
        'C' => Some(VK_C),
        'D' => Some(VK_D),
        'E' => Some(VK_E),
        'F' => Some(VK_F),
        'G' => Some(VK_G),
        'H' => Some(VK_H),
        'I' => Some(VK_I),
        'J' => Some(VK_J),
        'K' => Some(VK_K),
        'L' => Some(VK_L),
        'M' => Some(VK_M),
        'N' => Some(VK_N),
        'O' => Some(VK_O),
        'P' => Some(VK_P),
        'Q' => Some(VK_Q),
        'R' => Some(VK_R),
        'S' => Some(VK_S),
        'T' => Some(VK_T),
        'U' => Some(VK_U),
        'V' => Some(VK_V),
        'W' => Some(VK_W),
        'X' => Some(VK_X),
        'Y' => Some(VK_Y),
        'Z' => Some(VK_Z),
        '0' => Some(VK_0),
        '1' => Some(VK_1),
        '2' => Some(VK_2),
        '3' => Some(VK_3),
        '4' => Some(VK_4),
        '5' => Some(VK_5),
        '6' => Some(VK_6),
        '7' => Some(VK_7),
        '8' => Some(VK_8),
        '9' => Some(VK_9),
        ' ' => Some(VK_SPACE),
        _ => None,
    }
}

#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY;
