//! Image Processor
//!
//! Processes images for display on LCD buttons.
//!
//! Based on mirajazz library reverse engineering:
//! - Device expects JPEG images at 60x60 pixels
//! - Protocol v2/v3 devices use 1024-byte packet size

use image::{DynamicImage, GenericImageView, ImageBuffer, Rgb, RgbImage};
use std::io::Cursor;

/// LCD button width in pixels (from mirajazz - device expects 60x60)
pub const LCD_WIDTH: u32 = 60;
/// LCD button height in pixels (from mirajazz - device expects 60x60)
pub const LCD_HEIGHT: u32 = 60;
/// JPEG quality for encoding (90% as per mirajazz)
pub const JPEG_QUALITY: u8 = 90;

/// Image processing options
#[derive(Debug, Clone, Default)]
pub struct ImageOptions {
    /// Maintain aspect ratio when resizing
    pub preserve_aspect_ratio: bool,
    /// Background color for letterboxing (RGB)
    pub background_color: Option<(u8, u8, u8)>,
}

/// Process an image for LCD display
///
/// Resizes to 60x60 and encodes as JPEG (device protocol requirement).
pub fn process_image(image_data: &[u8], options: &ImageOptions) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(image_data)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let resized = resize_image(&img, options);
    convert_to_jpeg(&resized)
}

/// Process a base64-encoded image
pub fn process_base64_image(base64_data: &str, options: &ImageOptions) -> Result<Vec<u8>, String> {
    // Strip data URL prefix if present
    let data = if base64_data.contains(',') {
        base64_data.split(',').next_back().unwrap_or(base64_data)
    } else {
        base64_data
    };

    let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    process_image(&decoded, options)
}

/// Process an image from a file path
pub fn process_file_image(file_path: &str, options: &ImageOptions) -> Result<Vec<u8>, String> {
    let image_data = std::fs::read(file_path)
        .map_err(|e| format!("Failed to read image file '{}': {}", file_path, e))?;

    process_image(&image_data, options)
}

/// Process image data from various sources:
/// - File paths (file:// URLs or absolute paths)
/// - Base64-encoded data (with or without data URL prefix)
/// - HTTP/HTTPS URLs (not supported yet)
pub fn process_image_source(source: &str, options: &ImageOptions) -> Result<Vec<u8>, String> {
    // Handle file:// URLs
    if source.starts_with("file://") {
        // Strip file:// prefix and handle platform differences
        let path = if cfg!(windows) {
            // Windows: file:///C:/path/to/file -> C:/path/to/file
            source.strip_prefix("file:///").unwrap_or(&source[7..])
        } else {
            // Unix: file:///path/to/file -> /path/to/file
            source.strip_prefix("file://").unwrap_or(source)
        };
        // URL decode the path (handles %20 for spaces, etc.)
        let decoded_path = urlencoding_decode(path);
        return process_file_image(&decoded_path, options);
    }

    // Handle absolute file paths (Windows: C:\... or D:\..., Unix: /...)
    if is_absolute_path(source) {
        return process_file_image(source, options);
    }

    // Handle data URLs (data:image/png;base64,...)
    if source.starts_with("data:") {
        return process_base64_image(source, options);
    }

    // Assume base64 if none of the above
    process_base64_image(source, options)
}

/// Simple URL decoding for file paths
fn urlencoding_decode(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '%' {
            // Try to decode %XX
            let hex: String = chars.by_ref().take(2).collect();
            if hex.len() == 2 {
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    result.push(byte as char);
                    continue;
                }
            }
            // If decoding failed, keep the original
            result.push('%');
            result.push_str(&hex);
        } else {
            result.push(c);
        }
    }

    result
}

/// Check if a path is an absolute file path
fn is_absolute_path(path: &str) -> bool {
    // Unix absolute path
    if path.starts_with('/') {
        return true;
    }
    // Windows absolute path (C:\, D:\, etc.)
    if path.len() >= 3 {
        let chars: Vec<char> = path.chars().take(3).collect();
        if chars.len() >= 3
            && chars[0].is_ascii_alphabetic()
            && (chars[1] == ':')
            && (chars[2] == '\\' || chars[2] == '/')
        {
            return true;
        }
    }
    false
}

/// Create a solid color image as JPEG
pub fn create_solid_color(r: u8, g: u8, b: u8) -> Result<Vec<u8>, String> {
    let img: RgbImage = ImageBuffer::from_pixel(LCD_WIDTH, LCD_HEIGHT, Rgb([r, g, b]));
    convert_to_jpeg(&img)
}

/// Resize image to LCD dimensions
fn resize_image(img: &DynamicImage, options: &ImageOptions) -> RgbImage {
    if options.preserve_aspect_ratio {
        // Calculate scaling to fit within LCD dimensions
        let (orig_width, orig_height) = img.dimensions();
        let scale = (LCD_WIDTH as f32 / orig_width as f32)
            .min(LCD_HEIGHT as f32 / orig_height as f32);

        let new_width = (orig_width as f32 * scale) as u32;
        let new_height = (orig_height as f32 * scale) as u32;

        let resized = img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3);

        // Create output image with background color
        let bg = options.background_color.unwrap_or((0, 0, 0));
        let mut output = ImageBuffer::from_pixel(LCD_WIDTH, LCD_HEIGHT, Rgb([bg.0, bg.1, bg.2]));

        // Center the resized image
        let x_offset = (LCD_WIDTH - new_width) / 2;
        let y_offset = (LCD_HEIGHT - new_height) / 2;

        for (x, y, pixel) in resized.to_rgb8().enumerate_pixels() {
            if x + x_offset < LCD_WIDTH && y + y_offset < LCD_HEIGHT {
                output.put_pixel(x + x_offset, y + y_offset, *pixel);
            }
        }

        output
    } else {
        img.resize_exact(LCD_WIDTH, LCD_HEIGHT, image::imageops::FilterType::Lanczos3)
            .to_rgb8()
    }
}

/// Convert RGB image to JPEG byte array
///
/// Uses 90% quality as specified by mirajazz library.
fn convert_to_jpeg(img: &RgbImage) -> Result<Vec<u8>, String> {
    let mut buffer = Cursor::new(Vec::new());

    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, JPEG_QUALITY);
    encoder.encode(
        img.as_raw(),
        img.width(),
        img.height(),
        image::ExtendedColorType::Rgb8,
    ).map_err(|e| format!("Failed to encode JPEG: {}", e))?;

    Ok(buffer.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lcd_dimensions() {
        // Device expects 60x60 images per mirajazz protocol
        assert_eq!(LCD_WIDTH, 60);
        assert_eq!(LCD_HEIGHT, 60);
    }

    #[test]
    fn test_jpeg_quality() {
        // 90% quality as per mirajazz library
        assert_eq!(JPEG_QUALITY, 90);
    }

    #[test]
    fn test_create_solid_color_is_jpeg() {
        let data = create_solid_color(255, 0, 0).unwrap();
        // JPEG files start with FF D8 FF magic bytes
        assert!(data.len() >= 3);
        assert_eq!(data[0], 0xFF);
        assert_eq!(data[1], 0xD8);
        assert_eq!(data[2], 0xFF);
    }

    #[test]
    fn test_create_solid_color_reasonable_size() {
        let data = create_solid_color(255, 0, 0).unwrap();
        // A 60x60 JPEG should be reasonably small (typically 500-2000 bytes for solid color)
        assert!(data.len() > 100);
        assert!(data.len() < 10000);
    }

    #[test]
    fn test_convert_to_jpeg_valid() {
        let img: RgbImage = ImageBuffer::from_pixel(60, 60, Rgb([128, 128, 128]));
        let jpeg = convert_to_jpeg(&img).unwrap();
        // Verify JPEG magic bytes
        assert_eq!(jpeg[0], 0xFF);
        assert_eq!(jpeg[1], 0xD8);
        assert_eq!(jpeg[2], 0xFF);
    }

    #[test]
    fn test_urlencoding_decode_basic() {
        assert_eq!(urlencoding_decode("hello%20world"), "hello world");
        assert_eq!(urlencoding_decode("no%encoding"), "no%encoding"); // Invalid %en
        assert_eq!(urlencoding_decode("test"), "test");
    }

    #[test]
    fn test_urlencoding_decode_special_chars() {
        assert_eq!(urlencoding_decode("path%2Fto%2Ffile"), "path/to/file");
        assert_eq!(urlencoding_decode("file%3A%2F%2Ftest"), "file://test");
    }

    #[test]
    fn test_is_absolute_path_unix() {
        assert!(is_absolute_path("/home/user/image.png"));
        assert!(is_absolute_path("/tmp/test.jpg"));
        assert!(!is_absolute_path("relative/path.png"));
        assert!(!is_absolute_path("image.png"));
    }

    #[test]
    fn test_is_absolute_path_windows() {
        assert!(is_absolute_path("C:\\Users\\test.png"));
        assert!(is_absolute_path("D:/images/photo.jpg"));
        assert!(is_absolute_path("E:\\file.png"));
        assert!(!is_absolute_path("relative\\path.png"));
    }

    #[test]
    fn test_process_image_source_detects_file_url() {
        // Should fail because file doesn't exist, but error message shows it tried to read a file
        let result = process_image_source("file:///nonexistent/image.png", &ImageOptions::default());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Failed to read image file"), "Error was: {}", err);
    }

    #[test]
    fn test_process_image_source_detects_absolute_path() {
        // Should fail because file doesn't exist, but error shows it tried to read a file
        let result = process_image_source("/nonexistent/image.png", &ImageOptions::default());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Failed to read image file"), "Error was: {}", err);
    }

    #[test]
    fn test_process_image_source_handles_base64() {
        // Invalid base64 should give base64 decode error, not file read error
        let result = process_image_source("not-valid-base64!!!", &ImageOptions::default());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("base64") || err.contains("Failed to load image"), "Error was: {}", err);
    }
}
