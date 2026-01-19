import React from 'react';

/** Layer type for toggle */
export type LayerType = 'primary' | 'shift';

export interface LayerToggleProps {
  /** Currently selected layer */
  selected: LayerType;
  /** Callback when layer selection changes */
  onChange: (layer: LayerType) => void;
}

/**
 * LayerToggle component - segmented control to switch between Primary and Shift layers
 */
export const LayerToggle: React.FC<LayerToggleProps> = ({ selected, onChange }) => {
  return (
    <div className="layer-toggle" data-testid="layer-toggle">
      <button
        type="button"
        className={`layer-toggle__btn ${selected === 'primary' ? 'layer-toggle__btn--active' : ''}`}
        onClick={() => onChange('primary')}
        data-testid="layer-toggle-primary"
        aria-pressed={selected === 'primary'}
      >
        Primary
      </button>
      <button
        type="button"
        className={`layer-toggle__btn ${selected === 'shift' ? 'layer-toggle__btn--active' : ''}`}
        onClick={() => onChange('shift')}
        data-testid="layer-toggle-shift"
        aria-pressed={selected === 'shift'}
      >
        <span className="layer-toggle__shift-icon">⇧</span>
        Shift
      </button>
    </div>
  );
};

export default LayerToggle;
