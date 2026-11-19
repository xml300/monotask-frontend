import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          subtle: 'hsl(var(--surface-subtle))',
          elevated: 'hsl(var(--surface-elevated))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          secondary: 'hsl(var(--ink-secondary))',
          muted: 'hsl(var(--ink-muted))',
        },
        line: {
          DEFAULT: 'hsl(var(--line))',
          strong: 'hsl(var(--line-strong))',
        },
        status: {
          success: 'hsl(var(--status-success))',
          warning: 'hsl(var(--status-warning))',
          danger: 'hsl(var(--status-danger))',
          info: 'hsl(var(--status-info))',
        },
      },
      boxShadow: {
        hairline: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        elevated: '0 12px 32px -8px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.06)',
        pill: '0 16px 40px -10px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
