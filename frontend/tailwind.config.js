/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "var(--color-primary, #005d42)",
        "primary-container": "var(--color-primary-container, #047857)",
        "on-primary": "var(--color-on-primary, #ffffff)",
        "on-primary-container": "var(--color-on-primary-container, #9ffdd3)",
        "primary-fixed": "var(--color-primary-fixed, #97f5cc)",
        "primary-fixed-dim": "var(--color-primary-fixed-dim, #7bd8b1)",
        "on-primary-fixed": "var(--color-on-primary-fixed, #002115)",
        "on-primary-fixed-variant": "var(--color-on-primary-fixed-variant, #00513a)",

        "secondary": "var(--color-secondary, #006e2d)",
        "secondary-container": "var(--color-secondary-container, #e8f8ee)",
        "on-secondary": "var(--color-on-secondary, #ffffff)",
        "on-secondary-container": "var(--color-on-secondary-container, #005d42)",
        "secondary-fixed": "var(--color-secondary-fixed, #7ffc97)",
        "secondary-fixed-dim": "var(--color-secondary-fixed-dim, #62df7d)",
        "on-secondary-fixed": "var(--color-on-secondary-fixed, #002109)",
        "on-secondary-fixed-variant": "var(--color-on-secondary-fixed-variant, #005320)",

        "tertiary": "var(--color-tertiary, #495167)",
        "tertiary-container": "var(--color-tertiary-container, #616980)",
        "on-tertiary": "var(--color-on-tertiary, #ffffff)",
        "on-tertiary-container": "var(--color-on-tertiary-container, #e4e9ff)",

        "surface": "var(--color-surface, #f8f9ff)",
        "surface-dim": "var(--color-surface-dim, #cbdbf5)",
        "surface-bright": "var(--color-surface-bright, #f8f9ff)",
        "surface-container-lowest": "var(--color-surface-container-lowest, #ffffff)",
        "surface-container-low": "var(--color-surface-container-low, #eff4ff)",
        "surface-container": "var(--color-surface-container, #e5eeff)",
        "surface-container-high": "var(--color-surface-container-high, #dce9ff)",
        "surface-container-highest": "var(--color-surface-container-highest, #d3e4fe)",
        "surface-variant": "var(--color-surface-variant, #e2e8f0)",
        
        "background": "var(--color-surface, #f8f9ff)",
        "on-background": "var(--color-on-background, #0b1c30)",
        "on-surface": "var(--color-on-surface, #0b1c30)",
        "on-surface-variant": "var(--color-on-surface-variant, #3e4943)",

        "outline": "var(--color-outline, #6e7a73)",
        "outline-variant": "var(--color-outline-variant, #cbd5e1)",
        "inverse-surface": "var(--color-inverse-surface, #213145)",
        "inverse-on-surface": "var(--color-inverse-on-surface, #eaf1ff)",

        "error": "var(--color-error, #ba1a1a)",
        "error-container": "var(--color-error-container, #ffdad6)",
        "on-error": "var(--color-on-error, #ffffff)",
        "on-error-container": "var(--color-on-error-container, #93000a)",

        "risk-high": "#fb7185",
        "risk-medium": "#fbbf24",
        "risk-low": "#34d399",
        "info": "#60a5fa",

        // Workstation & Legacy compatibility
        workstation: {
          canvas: '#f8f9ff',
          surface: '#ffffff',
          darkcanvas: '#0b1326',
          darksurface: '#131b2e',
          border: '#cbd5e1',
          darkborder: '#334155',
          textprimary: '#0b1c30',
          textsecondary: '#3e4943',
          darktextprimary: '#f8fafc',
          darktextsecondary: '#94a3b8',
        },
        agri: {
          green: '#005d42',
          darkgreen: '#003827',
          amber: '#b45309',
          darkamber: '#92400e',
          red: '#ba1a1a',
          darkred: '#93000a',
          blue: '#1e40af',
          slate: '#1e293b',
        }
      },
      spacing: {
        "unit": "4px",
        "container-margin": "16px",
        "stack-md": "16px",
        "stack-sm": "8px",
        "gutter-grid": "12px",
        "stack-lg": "24px",
        "section-gap": "32px"
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        "label-md": ["Inter"],
        "title-lg": ["Inter"],
        "display-lg": ["Inter"],
        "headline-md": ["Inter"],
        "headline-lg-mobile": ["Inter"],
        "body-lg": ["Inter"],
        "headline-sm": ["Inter"],
        "title-md": ["Inter"],
        "label-sm": ["Inter"],
        "body-md": ["Inter"],
        "title-sm": ["Inter"],
        "label-lg": ["Inter"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "sm": "4px",
        "md": "8px",
        "lg": "12px",
        "xl": "16px",
        "full": "9999px"
      },
      boxShadow: {
        "xs": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "stitch": "0 2px 8px -2px rgba(11, 28, 48, 0.08)",
        "stitch-hover": "0 4px 14px -3px rgba(11, 28, 48, 0.12)"
      }
    },
  },
  plugins: [],
}
