import React, { useCallback, useState, useMemo } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { tauriAPI, fetchImageAsDataUrl } from '../../../lib/tauri-api';
import { ImageCropEditor } from './ImageCropEditor';

/** Maximum file size in bytes (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Supported image MIME types */
const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/x-icon', 'image/svg+xml'];

/** Supported file extensions */
const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg'];

/** Image validation result */
interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
}

export interface ImagePickerProps {
  /** Current image URL */
  imageUrl?: string;
  /** Callback when image changes */
  onChange: (imageUrl: string | undefined) => void;
  /** Whether an upload to device is in progress */
  isUploading?: boolean;
  /** Upload progress (0-100) */
  uploadProgress?: number;
  /** Button index for device preview (required for preview functionality) */
  buttonIndex?: number;
  /** Callback to preview image on device without saving */
  onPreview?: (buttonIndex: number, imageUrl: string) => Promise<void>;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  imageUrl,
  onChange,
  isUploading = false,
  uploadProgress,
  buttonIndex,
  onPreview,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSuccess, setPreviewSuccess] = useState<boolean | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isFetchingForCrop, setIsFetchingForCrop] = useState(false);

  // Convert imageUrl to a displayable URL for the preview
  // file:// URLs and absolute paths need to be converted using Tauri's asset protocol
  const displayUrl = useMemo(() => {
    if (!imageUrl) return undefined;

    // Data URLs and http(s) URLs can be used directly
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // For file:// URLs, extract the path and convert
    if (imageUrl.startsWith('file://')) {
      // Windows: file:///C:/path -> C:/path, Unix: file:///path -> /path
      const path = imageUrl.startsWith('file:///')
        ? imageUrl.slice(8)  // Remove file:///
        : imageUrl.slice(7); // Remove file://
      return convertFileSrc(path);
    }

    // For absolute paths, convert directly
    if (imageUrl.startsWith('/') || /^[A-Za-z]:[\\/]/.test(imageUrl)) {
      return convertFileSrc(imageUrl);
    }

    // For other URLs, return as-is
    return imageUrl;
  }, [imageUrl]);

  // Validate file extension
  const validateFileExtension = useCallback((filePath: string): boolean => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? SUPPORTED_EXTENSIONS.includes(extension) : false;
  }, []);

  // Handle browse for image
  const handleBrowse = useCallback(async () => {
    try {
      setError(null);
      setWarning(null);
      setIsLoading(true);

      const result = await tauriAPI.openFileDialog({
        title: 'Select Image',
        filters: [
          { name: 'Images', extensions: SUPPORTED_EXTENSIONS },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result && result.length > 0) {
        const filePath = result[0];

        // Validate file extension
        if (!validateFileExtension(filePath)) {
          const ext = filePath.split('.').pop()?.toLowerCase() || 'unknown';
          setError(`Unsupported file format: .${ext}`);
          return;
        }

        // Convert to file:// URL for display
        onChange(`file://${filePath}`);
      }
    } catch (err) {
      setError('Failed to open file dialog');
      console.error('Failed to open file dialog:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onChange, validateFileExtension]);

  // Handle URL input with validation
  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      setError(null);
      setWarning(null);
      setImageInfo(null);

      if (!value) {
        onChange(undefined);
        return;
      }

      // Validate URL/path format
      const isDataUrl = value.startsWith('data:');
      const isFileUrl = value.startsWith('file://');
      const isHttpUrl = value.startsWith('http://') || value.startsWith('https://');
      const isAbsolutePath = value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value);

      if (!isDataUrl && !isFileUrl && !isHttpUrl && !isAbsolutePath) {
        // Could be a relative path or invalid - show warning but allow
        setWarning('Path may not be valid. Use absolute path or URL.');
      }

      // Validate extension for file paths
      if ((isFileUrl || isAbsolutePath) && !validateFileExtension(value)) {
        const ext = value.split('.').pop()?.toLowerCase();
        if (ext && ext.length < 10) { // Reasonable extension length
          setWarning(`File extension .${ext} may not be supported`);
        }
      }

      onChange(value);
    },
    [onChange, validateFileExtension]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    onChange(undefined);
    setError(null);
    setWarning(null);
    setImageInfo(null);
  }, [onChange]);

  // Handle image load error
  const handleImageError = useCallback(() => {
    setError('Failed to load image');
    setImageInfo(null);
  }, []);

  // Handle image load success - capture dimensions for validation feedback
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setError(null);
    const img = e.currentTarget;
    const { naturalWidth, naturalHeight } = img;
    setImageInfo({ width: naturalWidth, height: naturalHeight });

    // Show dimension warning if image is significantly different from recommended 60x60
    // Backend auto-resizes to 60x60, but warn user about potential quality issues
    if (naturalWidth < 60 || naturalHeight < 60) {
      setWarning(`Image is ${naturalWidth}x${naturalHeight}px. May appear pixelated (recommended: 60x60px or larger).`);
    } else if (naturalWidth > 512 || naturalHeight > 512) {
      setWarning(`Large image (${naturalWidth}x${naturalHeight}px) will be resized to 60x60px.`);
    } else if (Math.abs(naturalWidth - naturalHeight) > naturalWidth * 0.2) {
      // Non-square images will be cropped/letterboxed
      setWarning(`Non-square image (${naturalWidth}x${naturalHeight}px). May be cropped.`);
    } else {
      setWarning(null);
    }
  }, []);

  // Handle preview on device - sends image to device without saving action
  const handlePreview = useCallback(async () => {
    if (!imageUrl || buttonIndex === undefined || !onPreview) {
      return;
    }

    setIsPreviewing(true);
    setPreviewSuccess(null);
    setError(null);

    try {
      await onPreview(buttonIndex, imageUrl);
      setPreviewSuccess(true);
      // Clear success indicator after 2 seconds
      setTimeout(() => setPreviewSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview on device');
      setPreviewSuccess(false);
    } finally {
      setIsPreviewing(false);
    }
  }, [imageUrl, buttonIndex, onPreview]);

  // Open crop editor with current image
  // For HTTP URLs, pre-fetch through backend to avoid CORS issues
  const handleOpenCrop = useCallback(async () => {
    if (!imageUrl) return;

    // For HTTP/HTTPS URLs, fetch through Rust backend to bypass CORS
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      setIsFetchingForCrop(true);
      setError(null);
      try {
        const dataUrl = await fetchImageAsDataUrl(imageUrl);
        setImageToCrop(dataUrl);
        setShowCropEditor(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch image for cropping');
      } finally {
        setIsFetchingForCrop(false);
      }
    } else if (displayUrl) {
      // For local files and data URLs, use display URL directly
      setImageToCrop(displayUrl);
      setShowCropEditor(true);
    }
  }, [imageUrl, displayUrl]);

  // Handle crop completion
  const handleCropComplete = useCallback((croppedDataUrl: string) => {
    onChange(croppedDataUrl);
    setShowCropEditor(false);
    setImageToCrop(null);
    setWarning(null); // Clear any size warnings since image is now properly cropped
  }, [onChange]);

  // Handle crop cancellation
  const handleCropCancel = useCallback(() => {
    setShowCropEditor(false);
    setImageToCrop(null);
  }, []);

  // Check if preview is available (has image, button index, and preview callback)
  const canPreview = imageUrl && buttonIndex !== undefined && onPreview && !error;

  // Check if crop is available (has image without errors)
  const canCrop = imageUrl && !error && !isUploading && !isFetchingForCrop;

  return (
    <div className="image-picker" data-testid="image-picker">
      {/* Preview area */}
      <div className={`image-picker__preview ${isUploading ? 'image-picker__preview--uploading' : ''}`}>
        {imageUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Button image preview"
              className="image-picker__preview-image"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
            {error && (
              <div className="image-picker__preview-error">
                <span className="image-picker__error-icon">⚠️</span>
                <span className="image-picker__error-text">{error}</span>
              </div>
            )}
            {isUploading && (
              <div className="image-picker__upload-overlay" data-testid="image-upload-overlay">
                <div className="image-picker__upload-spinner" />
                <span className="image-picker__upload-text">
                  {uploadProgress !== undefined ? `${uploadProgress}%` : 'Uploading...'}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="image-picker__preview-placeholder">
            <span className="image-picker__placeholder-icon">🖼️</span>
            <span className="image-picker__placeholder-text">No image</span>
          </div>
        )}
      </div>

      {/* Image info display */}
      {imageInfo && !error && (
        <div className="image-picker__info" data-testid="image-info">
          <span className="image-picker__info-text">
            {imageInfo.width}x{imageInfo.height}px
          </span>
        </div>
      )}

      {/* URL input */}
      <div className="image-picker__url-input">
        <input
          type="text"
          className={`action-form__input ${error ? 'action-form__input--error' : ''} ${warning ? 'action-form__input--warning' : ''}`}
          value={imageUrl || ''}
          onChange={handleUrlChange}
          placeholder="Image URL or file path..."
          disabled={isUploading}
          data-testid="image-url-input"
        />
      </div>

      {/* Validation feedback */}
      {(error || warning) && (
        <div className={`image-picker__feedback ${error ? 'image-picker__feedback--error' : 'image-picker__feedback--warning'}`} data-testid="image-feedback">
          <span className="image-picker__feedback-icon">{error ? '⚠️' : '💡'}</span>
          <span className="image-picker__feedback-text">{error || warning}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="image-picker__actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleBrowse}
          disabled={isLoading || isUploading || isPreviewing}
          data-testid="image-browse-btn"
        >
          {isLoading ? 'Loading...' : 'Browse'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleClear}
          disabled={!imageUrl || isUploading || isPreviewing}
          data-testid="image-clear-btn"
        >
          Clear
        </button>
        {(canCrop || isFetchingForCrop) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenCrop}
            disabled={isPreviewing || isUploading || isFetchingForCrop}
            data-testid="image-crop-btn"
            title="Crop image to select a specific area"
          >
            {isFetchingForCrop ? 'Loading...' : 'Crop'}
          </button>
        )}
        {canPreview && (
          <button
            type="button"
            className={`btn btn-sm ${previewSuccess === true ? 'btn-success' : previewSuccess === false ? 'btn-danger' : 'btn-primary'}`}
            onClick={handlePreview}
            disabled={isPreviewing || isUploading}
            data-testid="image-preview-btn"
            title="Send image to device to preview how it will look"
          >
            {isPreviewing ? 'Sending...' : previewSuccess === true ? 'Sent!' : 'Preview on Device'}
          </button>
        )}
      </div>

      {/* Hints */}
      <div className="image-picker__hints">
        <span className="action-form__hint">
          Images are automatically resized to 60x60px. PNG with transparent background recommended.
        </span>
      </div>

      {/* Crop Editor Modal */}
      {showCropEditor && imageToCrop && (
        <ImageCropEditor
          imageUrl={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
};

export default ImagePicker;
