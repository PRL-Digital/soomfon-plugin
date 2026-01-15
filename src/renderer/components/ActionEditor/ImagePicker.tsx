import React, { useCallback, useState } from 'react';

export interface ImagePickerProps {
  /** Current image URL */
  imageUrl?: string;
  /** Callback when image changes */
  onChange: (imageUrl: string | undefined) => void;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  imageUrl,
  onChange,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle browse for image
  const handleBrowse = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Note: openFileDialog is not yet implemented in the IPC handlers
      const api = window.electronAPI as { openFileDialog?: (options: unknown) => Promise<string[]> };
      if (api?.openFileDialog) {
        const result = await api.openFileDialog({
          properties: ['openFile'],
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (result && result.length > 0) {
          // Convert to file:// URL for display
          onChange(`file://${result[0]}`);
        }
      } else {
        // Fallback for development without Electron
        setError('File dialog not available');
      }
    } catch (err) {
      setError('Failed to open file dialog');
      console.error('Failed to open file dialog:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onChange]);

  // Handle URL input
  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      onChange(value || undefined);
      setError(null);
    },
    [onChange]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    onChange(undefined);
    setError(null);
  }, [onChange]);

  // Handle image load error
  const handleImageError = useCallback(() => {
    setError('Failed to load image');
  }, []);

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="image-picker" data-testid="image-picker">
      {/* Preview area */}
      <div className="image-picker__preview">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
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
          </>
        ) : (
          <div className="image-picker__preview-placeholder">
            <span className="image-picker__placeholder-icon">🖼️</span>
            <span className="image-picker__placeholder-text">No image</span>
          </div>
        )}
      </div>

      {/* URL input */}
      <div className="image-picker__url-input">
        <input
          type="text"
          className="action-form__input"
          value={imageUrl || ''}
          onChange={handleUrlChange}
          placeholder="Image URL or file path..."
          data-testid="image-url-input"
        />
      </div>

      {/* Action buttons */}
      <div className="image-picker__actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleBrowse}
          disabled={isLoading}
          data-testid="image-browse-btn"
        >
          {isLoading ? 'Loading...' : 'Browse'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleClear}
          disabled={!imageUrl}
          data-testid="image-clear-btn"
        >
          Clear
        </button>
      </div>

      {/* Hints */}
      <div className="image-picker__hints">
        <span className="action-form__hint">
          Recommended: 72x72px PNG with transparent background
        </span>
      </div>
    </div>
  );
};

export default ImagePicker;
