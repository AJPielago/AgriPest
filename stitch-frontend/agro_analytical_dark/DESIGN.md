---
name: Agro-Analytical Dark
colors:
  surface: '#0f172a'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#1e293b'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#f8fafc'
  on-surface-variant: '#94a3b8'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#334155'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#b9c7e0'
  on-secondary: '#233144'
  secondary-container: '#3c4a5e'
  on-secondary-container: '#abb9d2'
  tertiary: '#ffb3af'
  on-tertiary: '#650911'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  risk-high: '#fb7185'
  risk-medium: '#fbbf24'
  risk-low: '#34d399'
  info: '#60a5fa'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  gutter-grid: 12px
  container-margin: 16px
  section-gap: 32px
---

## Brand & Style

The design system transition to dark mode maintains its high-utility agricultural focus while shifting toward a **Corporate / Modern** nocturnal aesthetic. It is engineered for late-night farm management and low-light field monitoring, emphasizing focus and reducing eye strain without sacrificing professional rigor.

The brand personality remains grounded and systematic. By utilizing a deep slate foundation instead of pure black, the interface achieves a more sophisticated, "technical instrument" feel. The emotional response is one of precision, data-led confidence, and high-tech stewardship. Visual hierarchy is established through luminous accents and tonal depth rather than heavy shadows, ensuring that critical environmental metrics and alerts "pop" against the dark canvas.

## Colors

The color palette is optimized for high-contrast legibility on dark surfaces. The primary color, **Emerald-500 (#10b981)**, serves as the beacon for interaction and positive health states.

- **Base Surfaces:** We avoid pure black (#000000) to prevent "smearing" on OLED screens and to maintain a professional atmosphere. The base is **Slate-900 (#0f172a)**, with **Slate-800 (#1e293b)** used for cards and containers to create depth.
- **Typography:** Primary content uses **Slate-50 (#f8fafc)** for maximum readability, while secondary metadata uses **Slate-400 (#94a3b8)**.
- **Semantic Indicators:** Chart and status colors are shifted to their brighter, more desaturated counterparts (e.g., Rose-400 instead of Red-700) to ensure they appear vibrant and legible against the dark background.

## Typography

This design system uses **Inter** for its exceptional legibility in data-dense environments. In dark mode, font weights are carefully applied to prevent "glow" or text-thinning effects. 

- **Weight Selection:** Headlines maintain their bold weights to anchor the page layout. 
- **Body Text:** Uses standard weights, but relies on color (Slate-50 vs Slate-400) to establish hierarchy rather than just size.
- **Data Display:** For tabular data and technical logs, `body-md` is the primary workhorse, providing a balance of information density and scanability.

## Layout & Spacing

The layout utilizes a **Fluid Grid** model with a consistent 4px rhythm. The grid adapts from 4 columns on mobile to 12 columns on desktop.

Spacing is used to define "logical groups" without needing excessive borders. On dark surfaces, whitespace (or "dark space") is critical to prevent the UI from feeling claustrophobic. Use `stack-md` for vertical rhythm between dashboard modules and `stack-sm` for internal component elements.

## Elevation & Depth

In dark mode, hierarchy is communicated through **Tonal Layers** rather than heavy shadows.

- **Level 0 (Background):** Slate-900 (#0f172a). This is the base floor of the application.
- **Level 1 (Surface):** Slate-800 (#1e293b). Used for primary cards and content areas. This lighter tone creates a natural "lift" from the background.
- **Outlines:** A 1px border of **Slate-700 (#334155)** is used on all containers to define boundaries where tonal contrast might be subtle.
- **Glow & Interaction:** Interactive elements do not use shadows; instead, they use a subtle inner glow or a primary-colored stroke (Emerald-500) when focused or active.

## Shapes

The design system employs a **Rounded** shape language to maintain a modern, approachable feel within its technical context.

- **Standard Elements:** 0.5rem (8px) radius for buttons, input fields, and standard data cards.
- **Containers:** 1rem (16px) for larger layout sections or modal containers.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish categorical markers and risk indicators from square-ish functional buttons.

## Components

- **Buttons:**
  - *Primary:* Emerald-500 background with Slate-950 text for maximum contrast. 
  - *Secondary:* Outline style using the Slate-700 border and Slate-50 text.
- **Input Fields:** Slate-800 background with a Slate-700 border. On focus, the border transitions to Emerald-500.
- **Cards:** Defined by a Slate-800 background and a 1px Slate-700 border. Information inside is organized using the 4px spacing units.
- **Status Chips:** 
  - *High Risk:* Soft Rose-500/20 background with Rose-400 text.
  - *Medium Risk:* Soft Amber-500/20 background with Amber-400 text.
  - *Low Risk:* Soft Emerald-500/20 background with Emerald-400 text.
- **Charts:** Line and bar charts should use high-vibrancy stroke colors (Emerald-400, Blue-400, Amber-400) with a 2px stroke width. Grid lines within charts must use low-opacity Slate-700 to remain unobtrusive.