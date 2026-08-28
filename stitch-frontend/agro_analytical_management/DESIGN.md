---
name: Agro-Analytical Management
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3e4943'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7a73'
  outline-variant: '#bdc9c1'
  surface-tint: '#006c4e'
  primary: '#005d42'
  on-primary: '#ffffff'
  primary-container: '#047857'
  on-primary-container: '#9ffdd3'
  inverse-primary: '#7bd8b1'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#495167'
  on-tertiary: '#ffffff'
  tertiary-container: '#616980'
  on-tertiary-container: '#e4e9ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#97f5cc'
  primary-fixed-dim: '#7bd8b1'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#00513a'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
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
  container-margin: 16px
  gutter-grid: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  section-gap: 32px
---

## Brand & Style

The design system is engineered for high-utility agricultural environments where clarity and data integrity are paramount. It adopts a **Corporate / Modern** aesthetic, specifically tailored for field-to-office SaaS workflows. The personality is grounded, professional, and reliable—evoking trust through precision rather than decorative flair.

The interface prioritizes information density while maintaining legibility. It utilizes a structured, tiered layout that allows farm managers to scan critical pest alerts and health metrics instantly. Visual clutter is ruthlessly eliminated in favor of high-contrast typography and clear functional boundaries. The emotional response is one of control, efficiency, and environmental stewardship.

## Colors

The palette is rooted in the "Emerald" and "Slate" spectrums to reflect growth and industrial stability. 

- **Primary Accent (Emerald-700):** Used for primary actions, navigation states, and "Success" or "Healthy" indicators.
- **Secondary Accent (Green-600):** Employed for supplementary features and secondary status markers.
- **Base Neutrals:** Slate-900 is reserved for maximum legibility in body text and headers, while Slate-500 handles metadata and placeholder states.
- **Semantic Accents:** 
  - **High Risk:** Red-600 (#DC2626)
  - **Warning:** Amber-500 (#F59E0B)
  - **Information:** Blue-600 (#2563EB)

## Typography

The design system utilizes **Inter** exclusively to ensure a clean, systematic feel that scales well on mobile devices. 

- **Hierarchy:** Use `display-lg` for dashboard summaries and `headline-sm` for card titles.
- **Utility:** Data tables and technical logs should utilize `body-md` for maximum row density.
- **Context:** Use `label-sm` in all-caps for category headers or small metadata tags to differentiate them from actionable body text.
- **Mobile adjustment:** Headlines automatically scale down to `mobile` variants to maintain vertical rhythm on narrow screens.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a mobile-first philosophy. On mobile devices, the system uses a 4-column grid with 16px side margins. On desktop, this expands to a 12-column grid.

Spacing follows a strict 4px baseline grid. Elements within cards (like pest icons and labels) use `stack-sm` (8px), while the gap between separate cards on the dashboard uses `stack-md` (16px). For heavy data views, padding within containers may be reduced to 12px to allow more content visibility without scrolling.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Ambient Shadows** to define hierarchy. 

- **Level 0 (Background):** Slate-50 surface.
- **Level 1 (Cards/Surface):** White background with a 1px border of Slate-200. A very soft, diffused shadow (0px 1px 3px rgba(15, 23, 42, 0.08)) is applied to give a slight lift.
- **Level 2 (Active Elements):** For modals or expanded cards, use a more pronounced shadow (0px 10px 15px -3px rgba(15, 23, 42, 0.1)).
- **Interactive States:** Hovering or tapping a card should not significantly change elevation but rather change the border color to Emerald-700/20.

## Shapes

The shape language is "Rounded" to balance the industrial nature of the data with a modern SaaS feel.

- **Base Radius:** 0.5rem (8px) for standard cards, input fields, and buttons.
- **Large Radius:** 1rem (16px) for major dashboard containers or bottom sheets on mobile.
- **Pill Radius:** Used exclusively for status badges (e.g., "Active", "High Risk") and chips to distinguish them from actionable buttons.

## Components

- **Buttons:** 
  - *Primary:* Emerald-700 background, White text. Bold and high-contrast.
  - *Secondary:* Slate-100 background, Slate-900 text.
- **Status Badges:** Use a "Soft Tag" style. Background is a 10% opacity version of the status color (e.g., Light Green background for "Healthy") with high-contrast text in the 700-weight of that same hue.
- **Cards:** White background, 8px corner radius, 1px Slate-200 border. Content inside cards should be grouped by `stack-sm`.
- **Inputs:** Slate-50 background with a 1px Slate-200 border. On focus, the border transitions to Emerald-700 with a 2px outer glow of the same color at 10% opacity.
- **Pest Alerts:** Special high-priority cards using a Red-600 left-edge accent (4px border-left) to signify urgency.
- **Data Visualizations:** Use clean line charts with 2px stroke width. Avoid fills under lines unless comparing multiple datasets (use 5% opacity fills).