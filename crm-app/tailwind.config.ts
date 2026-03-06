import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CRM brand colors — configurable via CSS variables
        primary: 'hsl(var(--crm-primary) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--crm-primary-foreground) / <alpha-value>)',
        accent: 'hsl(var(--crm-accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--crm-accent-foreground) / <alpha-value>)',
        background: 'hsl(var(--crm-background) / <alpha-value>)',
        foreground: 'hsl(var(--crm-foreground) / <alpha-value>)',
        muted: 'hsl(var(--crm-muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--crm-muted-foreground) / <alpha-value>)',
        border: 'hsl(var(--crm-border) / <alpha-value>)',
        card: 'hsl(var(--crm-card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--crm-card-foreground) / <alpha-value>)',
        sidebar: 'hsl(var(--crm-sidebar) / <alpha-value>)',
        'sidebar-foreground': 'hsl(var(--crm-sidebar-foreground) / <alpha-value>)',
        'sidebar-active': 'hsl(var(--crm-sidebar-active) / <alpha-value>)',
        success: 'hsl(var(--crm-success) / <alpha-value>)',
        warning: 'hsl(var(--crm-warning) / <alpha-value>)',
        danger: 'hsl(var(--crm-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Nunito Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config
