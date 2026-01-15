import React, { useCallback } from 'react';
import type { MediaAction, MediaActionType } from '@shared/types/actions';

/** Available media actions */
const MEDIA_ACTIONS: { value: MediaActionType; label: string; icon: string }[] = [
  { value: 'play_pause', label: 'Play / Pause', icon: '⏯️' },
  { value: 'next', label: 'Next Track', icon: '⏭️' },
  { value: 'previous', label: 'Previous Track', icon: '⏮️' },
  { value: 'stop', label: 'Stop', icon: '⏹️' },
  { value: 'volume_up', label: 'Volume Up', icon: '🔊' },
  { value: 'volume_down', label: 'Volume Down', icon: '🔉' },
  { value: 'mute', label: 'Mute / Unmute', icon: '🔇' },
];

export interface MediaActionFormProps {
  /** Current configuration */
  config: Partial<MediaAction>;
  /** Callback when configuration changes */
  onChange: (config: Partial<MediaAction>) => void;
}

export const MediaActionForm: React.FC<MediaActionFormProps> = ({
  config,
  onChange,
}) => {
  // Handle action change
  const handleActionChange = useCallback(
    (action: MediaActionType) => {
      onChange({ ...config, action });
    },
    [config, onChange]
  );

  // Handle volume amount change
  const handleVolumeAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      onChange({ ...config, volumeAmount: isNaN(value) ? undefined : value });
    },
    [config, onChange]
  );

  const showVolumeAmount =
    config.action === 'volume_up' || config.action === 'volume_down';

  return (
    <div className="action-form action-form--media" data-testid="media-action-form">
      {/* Media action selector */}
      <div className="action-form__row">
        <label className="action-form__label">Media Control</label>
        <div className="media-action-grid">
          {MEDIA_ACTIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              className={`media-action-btn ${
                config.action === value ? 'media-action-btn--active' : ''
              }`}
              onClick={() => handleActionChange(value)}
              data-testid={`media-action-${value}`}
            >
              <span className="media-action-btn__icon">{icon}</span>
              <span className="media-action-btn__label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Volume amount (for volume up/down) */}
      {showVolumeAmount && (
        <div className="action-form__row">
          <label className="action-form__label">Volume Step</label>
          <div className="volume-amount-input">
            <input
              type="range"
              className="action-form__range"
              value={config.volumeAmount || 5}
              onChange={handleVolumeAmountChange}
              min="1"
              max="20"
              step="1"
              data-testid="media-volume-range"
            />
            <span className="volume-amount-value">
              {config.volumeAmount || 5}%
            </span>
          </div>
          <span className="action-form__hint">
            Amount to change volume per press
          </span>
        </div>
      )}

      {/* Description */}
      <div className="action-form__row action-form__row--info">
        <div className="media-info">
          <span className="media-info__icon">ℹ️</span>
          <span className="media-info__text">
            Media controls work with the currently active media player on your system
            (Spotify, VLC, Windows Media Player, web browsers, etc.)
          </span>
        </div>
      </div>
    </div>
  );
};

export default MediaActionForm;
