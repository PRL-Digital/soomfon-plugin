//! Image Processor
//!
//! Processes images for display on LCD buttons (72x72, RGB565 format).

use image::{DynamicImage, GenericImageView, ImageBuffer, Rgb, RgbImage};

/// LCD button width in pixels
pub const LCD_WIDTH: u32 = 72;
/// LCD button height in pixels
pub const LCD_HEIGHT: u32 = 72;
/// Total bytes per LCD image (72 * 72 * 2 bytes per pixel)
pub const LCD_IMAGE_SIZE: usize = (LCD_WIDTH * LCD_HEIGHT * 2) as usize;

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
/// Resizes to 72x72 and converts to RGB565 format.
pub fn process_image(image_data: &[u8], options: &ImageOptions) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(image_data)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let resized = resize_image(&img, options);
    Ok(convert_to_rgb565(&resized))
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

/// Create a solid color image
pub fn create_solid_color(r: u8, g: u8, b: u8) -> Vec<u8> {
    let rgb565 = rgb_to_rgb565(r, g, b);
    let mut data = Vec::with_capacity(LCD_IMAGE_SIZE);

    for _ in 0..(LCD_WIDTH * LCD_HEIGHT) {
        data.push((rgb565 & 0xFF) as u8);
        data.push((rgb565 >> 8) as u8);
    }

    data
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

/// Convert RGB888 image to RGB565 byte array
fn convert_to_rgb565(img: &RgbImage) -> Vec<u8> {
    let mut data = Vec::with_capacity(LCD_IMAGE_SIZE);

    for pixel in img.pixels() {
        let rgb565 = rgb_to_rgb565(pixel[0], pixel[1], pixel[2]);
        // Little-endian byte order
        data.push((rgb565 & 0xFF) as u8);
        data.push((rgb565 >> 8) as u8);
    }

    data
}

/// Convert RGB888 to RGB565
#[inline]
fn rgb_to_rgb565(r: u8, g: u8, b: u8) -> u16 {
    let r5 = (r as u16 >> 3) & 0x1F;
    let g6 = (g as u16 >> 2) & 0x3F;
    let b5 = (b as u16 >> 3) & 0x1F;
    (r5 << 11) | (g6 << 5) | b5
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rgb_to_rgb565_black() {
        assert_eq!(rgb_to_rgb565(0, 0, 0), 0x0000);
    }

    #[test]
    fn test_rgb_to_rgb565_white() {
        assert_eq!(rgb_to_rgb565(255, 255, 255), 0xFFFF);
    }

    #[test]
    fn test_rgb_to_rgb565_red() {
        // Pure red: R=255, G=0, B=0 -> R5=31, G6=0, B5=0 -> 0xF800
        assert_eq!(rgb_to_rgb565(255, 0, 0), 0xF800);
    }

    #[test]
    fn test_rgb_to_rgb565_green() {
        // Pure green: R=0, G=255, B=0 -> R5=0, G6=63, B5=0 -> 0x07E0
        assert_eq!(rgb_to_rgb565(0, 255, 0), 0x07E0);
    }

    #[test]
    fn test_rgb_to_rgb565_blue() {
        // Pure blue: R=0, G=0, B=255 -> R5=0, G6=0, B5=31 -> 0x001F
        assert_eq!(rgb_to_rgb565(0, 0, 255), 0x001F);
    }

    #[test]
    fn test_create_solid_color_size() {
        let data = create_solid_color(255, 0, 0);
        assert_eq!(data.len(), LCD_IMAGE_SIZE);
    }

    #[test]
    fn test_create_solid_color_content() {
        let data = create_solid_color(255, 0, 0);
        // Check first pixel (little-endian RGB565 for red)
        assert_eq!(data[0], 0x00); // Low byte of 0xF800
        assert_eq!(data[1], 0xF8); // High byte of 0xF800
    }
}
