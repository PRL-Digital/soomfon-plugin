/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx}',
    './src/renderer/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background colors
        bg: {
          primary: '#1e1e1e',
          secondary: '#252526',
          tertiary: '#2d2d2d',
          hover: '#3e3e3e',
        },
        // Text colors
        text: {
          primary: '#ffffff',
          secondary: '#cccccc',
          muted: '#888888',
        },
        // Accent colors
        accent: {
          DEFAULT: '#0078d4',
          hover: '#1e90ff',
        },
        // Border
        border: '#3c3c3c',
        // Status colors
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Open Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['0.625rem', { lineHeight: '1rem' }],
        sm: ['0.75rem', { lineHeight: '1rem' }],
        base: ['0.875rem', { lineHeight: '1.25rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
      },
      animation: {
        pulse: 'pulse 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
