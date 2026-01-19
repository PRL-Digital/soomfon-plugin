import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

/** Target output size for button images */
const OUTPUT_SIZE = 60;

/** Minimum crop size in pixels */
const MIN_CROP_SIZE = 20;

export interface ImageCropEditorProps {
  /** Image URL to crop */
  imageUrl: string;
  /** Callback when cropping is complete */
  onCropComplete: (croppedDataUrl: string) => void;
  /** Callback when dialog is cancelled */
  onCancel: () => void;
}

/**
 * Generates a centered square crop that maximizes use of the image
 */
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      1, // 1:1 aspect ratio for square
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

/**
 * Gets the cropped image as a data URL
 */
async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Set canvas size to the output size (60x60)
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  // Calculate scale factors
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Draw the cropped portion of the image to the canvas, scaled to output size
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  // Return as data URL (PNG for quality, supports transparency)
  return canvas.toDataURL('image/png');
}

/**
 * ImageCropEditor component provides an interactive cropping interface
 * for selecting a square region of an image to use as a button icon.
 *
 * The crop is always 1:1 aspect ratio and outputs a 60x60 PNG image.
 */
export const ImageCropEditor: React.FC<ImageCropEditorProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Initialize crop when image loads
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
    setError(null);
  }, []);

  // Handle image load error
  const handleImageError = useCallback(() => {
    setError('Failed to load image for cropping');
  }, []);

  // Handle crop completion
  const handleApplyCrop = useCallback(async () => {
    if (!imgRef.current || !completedCrop) {
      setError('Please select a crop area');
      return;
    }

    // Validate crop has meaningful size
    if (completedCrop.width < MIN_CROP_SIZE || completedCrop.height < MIN_CROP_SIZE) {
      setError('Crop area is too small');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const croppedDataUrl = await getCroppedImg(imgRef.current, completedCrop);
      onCropComplete(croppedDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop image');
      setIsProcessing(false);
    }
  }, [completedCrop, onCropComplete]);

  // Handle escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !isProcessing && completedCrop) {
        handleApplyCrop();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, handleApplyCrop, isProcessing, completedCrop]);

  return (
    <div className="image-crop-editor__overlay" data-testid="image-crop-editor">
      <div className="image-crop-editor__dialog">
        <div className="image-crop-editor__header">
          <h3 className="image-crop-editor__title">Crop Image</h3>
          <p className="image-crop-editor__subtitle">
            Select a square area to use as the button image (60×60px)
          </p>
        </div>

        <div className="image-crop-editor__content">
          {error ? (
            <div className="image-crop-editor__error" data-testid="crop-error">
              <span className="image-crop-editor__error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          ) : null}

          <div className="image-crop-editor__crop-container">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              minWidth={MIN_CROP_SIZE}
              minHeight={MIN_CROP_SIZE}
              circularCrop={false}
              keepSelection={true}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Image to crop"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="image-crop-editor__image"
                data-testid="crop-source-image"
              />
            </ReactCrop>
          </div>

          {completedCrop && (
            <div className="image-crop-editor__preview-section">
              <span className="image-crop-editor__preview-label">Preview (60×60px):</span>
              <div
                className="image-crop-editor__preview"
                data-testid="crop-preview"
                style={{
                  width: OUTPUT_SIZE,
                  height: OUTPUT_SIZE,
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: imgRef.current
                    ? `${(imgRef.current.width / completedCrop.width) * OUTPUT_SIZE}px ${(imgRef.current.height / completedCrop.height) * OUTPUT_SIZE}px`
                    : 'cover',
                  backgroundPosition: imgRef.current
                    ? `-${(completedCrop.x / completedCrop.width) * OUTPUT_SIZE}px -${(completedCrop.y / completedCrop.height) * OUTPUT_SIZE}px`
                    : 'center',
                }}
              />
            </div>
          )}
        </div>

        <div className="image-crop-editor__footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isProcessing}
            data-testid="crop-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyCrop}
            disabled={isProcessing || !completedCrop}
            data-testid="crop-apply-btn"
          >
            {isProcessing ? 'Processing...' : 'Apply Crop'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropEditor;
