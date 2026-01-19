/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ImagePicker } from './ImagePicker';

describe('ImagePicker', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockOnPreview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockOnPreview = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
  });

  describe('rendering', () => {
    it('should render the image picker with data-testid', () => {
      render(<ImagePicker onChange={mockOnChange} />);
      expect(screen.getByTestId('image-picker')).toBeTruthy();
    });

    it('should show placeholder when no image is selected', () => {
      render(<ImagePicker onChange={mockOnChange} />);
      expect(screen.getByText('No image')).toBeTruthy();
    });

    it('should render image preview when imageUrl is provided', () => {
      render(<ImagePicker imageUrl="test-image.png" onChange={mockOnChange} />);
      const img = screen.getByAltText('Button image preview');
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toBe('test-image.png');
    });

    it('should render Browse and Clear buttons', () => {
      render(<ImagePicker onChange={mockOnChange} />);
      expect(screen.getByTestId('image-browse-btn')).toBeTruthy();
      expect(screen.getByTestId('image-clear-btn')).toBeTruthy();
    });

    it('should show URL input field', () => {
      render(<ImagePicker onChange={mockOnChange} />);
      expect(screen.getByTestId('image-url-input')).toBeTruthy();
    });
  });

  describe('preview on device button', () => {
    it('should not show preview button when no onPreview callback is provided', () => {
      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
        />
      );
      expect(screen.queryByTestId('image-preview-btn')).toBeNull();
    });

    it('should not show preview button when no buttonIndex is provided', () => {
      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          onPreview={mockOnPreview}
        />
      );
      expect(screen.queryByTestId('image-preview-btn')).toBeNull();
    });

    it('should not show preview button when no imageUrl is provided', () => {
      render(
        <ImagePicker
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );
      expect(screen.queryByTestId('image-preview-btn')).toBeNull();
    });

    it('should show preview button when imageUrl, buttonIndex, and onPreview are provided', () => {
      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );
      expect(screen.getByTestId('image-preview-btn')).toBeTruthy();
      expect(screen.getByText('Preview on Device')).toBeTruthy();
    });

    it('should call onPreview with buttonIndex and imageUrl when preview button is clicked', async () => {
      mockOnPreview.mockResolvedValue(undefined);

      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={2}
          onPreview={mockOnPreview}
        />
      );

      const previewBtn = screen.getByTestId('image-preview-btn');
      await act(async () => {
        fireEvent.click(previewBtn);
      });

      expect(mockOnPreview).toHaveBeenCalledWith(2, 'test-image.png');
    });

    it('should show "Sending..." while preview is in progress', async () => {
      vi.useRealTimers(); // Use real timers for this test

      let resolvePreview: () => void;
      mockOnPreview.mockImplementation(() => new Promise((resolve) => {
        resolvePreview = resolve;
      }));

      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      // Simulate successful image load to clear any error state
      const img = screen.getByAltText('Button image preview');
      Object.defineProperty(img, 'naturalWidth', { value: 100, writable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, writable: true });
      fireEvent.load(img);

      const previewBtn = screen.getByTestId('image-preview-btn');
      fireEvent.click(previewBtn);

      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeTruthy();
      });

      // Cleanup: resolve the promise
      await act(async () => {
        resolvePreview!();
      });

      vi.useFakeTimers(); // Restore fake timers
    });

    it('should show "Sent!" on successful preview', async () => {
      mockOnPreview.mockResolvedValue(undefined);

      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      const previewBtn = screen.getByTestId('image-preview-btn');
      await act(async () => {
        fireEvent.click(previewBtn);
      });

      expect(screen.getByText('Sent!')).toBeTruthy();
    });

    it('should show error message on preview failure', async () => {
      vi.useRealTimers(); // Use real timers for async tests

      mockOnPreview.mockRejectedValue(new Error('Device disconnected'));

      // Use a valid data URL to avoid image loading errors
      const validDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      render(
        <ImagePicker
          imageUrl={validDataUrl}
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      // Wait for image to load and verify preview button is visible
      await waitFor(() => {
        expect(screen.getByTestId('image-preview-btn')).toBeTruthy();
      });

      const previewBtn = screen.getByTestId('image-preview-btn');
      await act(async () => {
        fireEvent.click(previewBtn);
      });

      await waitFor(() => {
        // Error appears in both preview overlay and feedback section
        const feedback = screen.getByTestId('image-feedback');
        expect(feedback.textContent).toContain('Device disconnected');
      });

      vi.useFakeTimers(); // Restore
    });

    it('should show generic error message for non-Error rejections', async () => {
      vi.useRealTimers(); // Use real timers for async tests

      mockOnPreview.mockRejectedValue('Unknown error');

      // Use a valid data URL to avoid image loading errors
      const validDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      render(
        <ImagePicker
          imageUrl={validDataUrl}
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      // Wait for image to load and verify preview button is visible
      await waitFor(() => {
        expect(screen.getByTestId('image-preview-btn')).toBeTruthy();
      });

      const previewBtn = screen.getByTestId('image-preview-btn');
      await act(async () => {
        fireEvent.click(previewBtn);
      });

      await waitFor(() => {
        // Error appears in both preview overlay and feedback section
        const feedback = screen.getByTestId('image-feedback');
        expect(feedback.textContent).toContain('Failed to preview on device');
      });

      vi.useFakeTimers(); // Restore
    });

    it('should clear success indicator after 2 seconds', async () => {
      mockOnPreview.mockResolvedValue(undefined);

      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      const previewBtn = screen.getByTestId('image-preview-btn');
      await act(async () => {
        fireEvent.click(previewBtn);
      });

      expect(screen.getByText('Sent!')).toBeTruthy();

      // Fast-forward 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Preview on Device')).toBeTruthy();
    });

    it('should disable preview button while uploading', () => {
      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
          isUploading={true}
        />
      );

      const previewBtn = screen.getByTestId('image-preview-btn');
      expect(previewBtn).toHaveProperty('disabled', true);
    });

    it('should disable other buttons while previewing', async () => {
      vi.useRealTimers(); // Use real timers for async tests

      let resolvePreview: () => void;
      mockOnPreview.mockImplementation(() => new Promise((resolve) => {
        resolvePreview = resolve;
      }));

      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      // Simulate successful image load first
      const img = screen.getByAltText('Button image preview');
      Object.defineProperty(img, 'naturalWidth', { value: 100, writable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, writable: true });
      fireEvent.load(img);

      const previewBtn = screen.getByTestId('image-preview-btn');
      fireEvent.click(previewBtn);

      await waitFor(() => {
        expect(screen.getByTestId('image-browse-btn')).toHaveProperty('disabled', true);
        expect(screen.getByTestId('image-clear-btn')).toHaveProperty('disabled', true);
      });

      // Cleanup
      await act(async () => {
        resolvePreview!();
      });

      vi.useFakeTimers(); // Restore
    });

    it('should have correct CSS class for success state', async () => {
      mockOnPreview.mockResolvedValue(undefined);

      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      const previewBtn = screen.getByTestId('image-preview-btn');
      await act(async () => {
        fireEvent.click(previewBtn);
      });

      expect(previewBtn.classList.contains('btn-success')).toBe(true);
    });

    it('should hide preview button and show error when preview fails', async () => {
      vi.useRealTimers(); // Use real timers for async tests

      mockOnPreview.mockRejectedValue(new Error('Preview failed'));

      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      // Simulate successful image load first
      const img = screen.getByAltText('Button image preview');
      Object.defineProperty(img, 'naturalWidth', { value: 100, writable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, writable: true });
      fireEvent.load(img);

      const previewBtn = screen.getByTestId('image-preview-btn');
      await act(async () => {
        fireEvent.click(previewBtn);
      });

      // When preview fails, error is set which hides the preview button
      // and shows an error message in the feedback area
      await waitFor(() => {
        expect(screen.queryByTestId('image-preview-btn')).toBeNull();
        const feedback = screen.getByTestId('image-feedback');
        expect(feedback.textContent).toContain('Preview failed');
      });

      vi.useFakeTimers(); // Restore
    });
  });

  describe('URL input', () => {
    it('should call onChange when URL is entered', () => {
      render(<ImagePicker onChange={mockOnChange} />);
      const input = screen.getByTestId('image-url-input');
      fireEvent.change(input, { target: { value: 'http://example.com/image.png' } });
      expect(mockOnChange).toHaveBeenCalledWith('http://example.com/image.png');
    });

    it('should call onChange with undefined when URL is cleared', () => {
      render(<ImagePicker imageUrl="test.png" onChange={mockOnChange} />);
      const input = screen.getByTestId('image-url-input');
      fireEvent.change(input, { target: { value: '' } });
      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should show warning for invalid path format', () => {
      render(<ImagePicker onChange={mockOnChange} />);
      const input = screen.getByTestId('image-url-input');
      fireEvent.change(input, { target: { value: 'relative/path.png' } });

      expect(screen.getByTestId('image-feedback')).toBeTruthy();
      expect(screen.getByText('Path may not be valid. Use absolute path or URL.')).toBeTruthy();
    });
  });

  describe('clear button', () => {
    it('should be disabled when no image is selected', () => {
      render(<ImagePicker onChange={mockOnChange} />);
      const clearBtn = screen.getByTestId('image-clear-btn');
      expect(clearBtn).toHaveProperty('disabled', true);
    });

    it('should be enabled when image is selected', () => {
      render(<ImagePicker imageUrl="test.png" onChange={mockOnChange} />);
      const clearBtn = screen.getByTestId('image-clear-btn');
      expect(clearBtn).toHaveProperty('disabled', false);
    });

    it('should call onChange with undefined when clicked', () => {
      render(<ImagePicker imageUrl="test.png" onChange={mockOnChange} />);
      const clearBtn = screen.getByTestId('image-clear-btn');
      fireEvent.click(clearBtn);
      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe('upload progress', () => {
    it('should show upload overlay when isUploading is true', () => {
      render(
        <ImagePicker
          imageUrl="test.png"
          onChange={mockOnChange}
          isUploading={true}
        />
      );
      expect(screen.getByTestId('image-upload-overlay')).toBeTruthy();
    });

    it('should show progress percentage when provided', () => {
      render(
        <ImagePicker
          imageUrl="test.png"
          onChange={mockOnChange}
          isUploading={true}
          uploadProgress={75}
        />
      );
      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('should show "Uploading..." when no progress percentage', () => {
      render(
        <ImagePicker
          imageUrl="test.png"
          onChange={mockOnChange}
          isUploading={true}
        />
      );
      expect(screen.getByText('Uploading...')).toBeTruthy();
    });

    it('should disable URL input when uploading', () => {
      render(
        <ImagePicker
          onChange={mockOnChange}
          isUploading={true}
        />
      );
      const input = screen.getByTestId('image-url-input');
      expect(input).toHaveProperty('disabled', true);
    });
  });

  describe('crop button', () => {
    it('should not show crop button when no image is selected', () => {
      render(<ImagePicker onChange={mockOnChange} />);
      expect(screen.queryByTestId('image-crop-btn')).toBeNull();
    });

    it('should show crop button when image is selected and no error', () => {
      render(<ImagePicker imageUrl="test-image.png" onChange={mockOnChange} />);

      // Simulate successful image load first
      const img = screen.getByAltText('Button image preview');
      Object.defineProperty(img, 'naturalWidth', { value: 100, writable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, writable: true });
      fireEvent.load(img);

      expect(screen.getByTestId('image-crop-btn')).toBeTruthy();
    });

    it('should not show crop button when there is an error', () => {
      render(<ImagePicker imageUrl="test-image.png" onChange={mockOnChange} />);

      // Simulate image load error
      const img = screen.getByAltText('Button image preview');
      fireEvent.error(img);

      expect(screen.queryByTestId('image-crop-btn')).toBeNull();
    });

    it('should not show crop button while uploading', () => {
      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          isUploading={true}
        />
      );
      expect(screen.queryByTestId('image-crop-btn')).toBeNull();
    });

    it('should disable crop button while previewing', async () => {
      vi.useRealTimers();

      let resolvePreview: () => void;
      mockOnPreview.mockImplementation(() => new Promise((resolve) => {
        resolvePreview = resolve;
      }));

      render(
        <ImagePicker
          imageUrl="test-image.png"
          onChange={mockOnChange}
          buttonIndex={0}
          onPreview={mockOnPreview}
        />
      );

      // Simulate successful image load
      const img = screen.getByAltText('Button image preview');
      Object.defineProperty(img, 'naturalWidth', { value: 100, writable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, writable: true });
      fireEvent.load(img);

      const previewBtn = screen.getByTestId('image-preview-btn');
      fireEvent.click(previewBtn);

      await waitFor(() => {
        const cropBtn = screen.getByTestId('image-crop-btn');
        expect(cropBtn).toHaveProperty('disabled', true);
      });

      // Cleanup
      await act(async () => {
        resolvePreview!();
      });

      vi.useFakeTimers();
    });

    it('should have correct title attribute', () => {
      render(<ImagePicker imageUrl="test-image.png" onChange={mockOnChange} />);

      // Simulate successful image load
      const img = screen.getByAltText('Button image preview');
      Object.defineProperty(img, 'naturalWidth', { value: 100, writable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, writable: true });
      fireEvent.load(img);

      const cropBtn = screen.getByTestId('image-crop-btn');
      expect(cropBtn.getAttribute('title')).toBe('Crop image to select a specific area');
    });
  });
});
