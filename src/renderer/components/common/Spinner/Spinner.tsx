import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  /** Size of the spinner: sm (16px), md (24px), lg (32px) */
  size?: SpinnerSize;
  /** Optional CSS class name */
  className?: string;
  /** Text to show alongside spinner */
  text?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'spinner--sm',
  md: 'spinner--md',
  lg: 'spinner--lg',
};

/**
 * Spinner component for indicating loading states.
 *
 * Usage:
 * <Spinner /> - Default medium size
 * <Spinner size="sm" /> - Small spinner
 * <Spinner size="lg" text="Loading..." /> - Large spinner with text
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  text,
}) => {
  return (
    <div className={`spinner-container ${className}`}>
      <div
        className={`spinner ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
      {text && <span className="spinner__text">{text}</span>}
    </div>
  );
};
