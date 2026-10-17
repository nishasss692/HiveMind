---
name: Technical Memory & Verification System
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
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006780'
  on-secondary: '#ffffff'
  secondary-container: '#76dcff'
  on-secondary-container: '#006077'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4c'
  on-tertiary-container: '#7df1bd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#b7eaff'
  secondary-fixed-dim: '#6cd3f7'
  on-secondary-fixed: '#001f28'
  on-secondary-fixed-variant: '#004e61'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  status-success: '#059669'
  status-success-subtle: '#ecfdf5'
  status-success-border: '#a7f3d0'
  status-unverified: '#d97706'
  status-unverified-subtle: '#fffbeb'
  status-unverified-border: '#fde68a'
  status-failure: '#e11d48'
  status-failure-subtle: '#fff1f2'
  status-failure-border: '#fecdd3'
  bg-canvas: '#f8fafc'
  bg-surface: '#ffffff'
  bg-surface-subtle: '#f1f5f9'
  border-subtle: '#e2e8f0'
  border-strong: '#cbd5e1'
  text-primary: '#0f172a'
  text-secondary: '#334155'
  text-muted: '#64748b'
  code-token-accent: '#0284c7'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system delivers a high-density, precise engineering interface engineered specifically for developer tools, causal graph memory structures, and automated verification suites. The aesthetic is utilitarian, analytical, and uncompromisingly clear, prioritizing information density and legibility over ornamentation.

The visual tone reflects rigorous software craft: crisp light surfaces, low-contrast structural dividers, micro-status tags, and syntax-level visual markers. The UI eliminates unnecessary visual friction so engineers can inspect code diffs, DAG execution steps, and solution evaluation metrics effortlessly.

Core principles:
- **Pragmatic Modernism:** Utilitarian surfaces paired with fine-drawn 1px borders, avoiding superfluous decoration.
- **Evidence-First Hierarchy:** Statuses and verification states (`VERIFIED_SUCCESS`, `UNVERIFIED`, `VERIFIED_FAILURE`) command primary semantic attention through dedicated state accents.
- **Operational Density:** Tight, legible structural scales allowing high volumes of logs, graph nodes, telemetry metrics, and code blocks to live cohesively on a single screen.

## Colors

The palette employs a crisp, light-mode engineering canvas configured for prolonged readability during intensive analysis sessions. 

- **Surface Structure:** The default background uses an ultra-subtle slate canvas (`#f8fafc`), layered with clean white (`#ffffff`) for elevated panels and cards, and muted slate (`#f1f5f9`) for code containers, tables, and nested panels.
- **Text & Hierarchy:** Pure slate-charcoal (`#0f172a`) anchors primary headings and values, balanced by structured body slate (`#334155`) and metadata-level muted tones (`#64748b`).
- **Primary & Secondary Engines:** Indigo (`#4f46e5`) anchors primary actions, active navigational states, and workflow triggers. Cyan (`#0891b2`) drives graph relations, query syntax references, and causal link lines.
- **Verification Matrix:**
  - `VERIFIED_SUCCESS`: Emerald (`#059669`) with subtle green backing (`#ecfdf5`) and soft perimeter stroke (`#a7f3d0`).
  - `UNVERIFIED`: Amber (`#d97706`) with light amber backing (`#fffbeb`) and alert boundary (`#fde68a`).
  - `VERIFIED_FAILURE`: Crimson (`#e11d48`) with light wash (`#fff1f2`) and distinct perimeter stroke (`#fecdd3`).

## Typography

The type system blends Geist's neutral, hyper-legible geometric grotesk for interfaces with JetBrains Mono for execution telemetry, schema paths, status tags, and inline syntax.

- **Systematic Structure:** Type hierarchy scales conservatively. Headings prioritize high contrast weight (`600`) with tight letter spacing rather than oversized dimensions, preventing interface sprawl on data-heavy layouts.
- **Monospaced Integration:** All graph entities (`Task`, `Problem`, `Solution`), file paths, git commit SHAs, latency metrics, and verification states must use the label or code styles powered by JetBrains Mono.
- **Tabular Numerics:** Monospaced formatting applies strictly to all numeric counters, execution runtimes, and confidence percentages to ensure vertical alignment across data grids and verification output tables.

## Layout & Spacing

Layouts adhere to an 8-point baseline grid with a 4-point micro-step for tight toolbars and badge tags.

- **Grid Model:** Fixed max-width workspace shells (`1440px`) centered on larger displays, backed by a 12-column responsive fluid grid with 1rem (16px) gutters on desktop and 0.75rem (12px) on mobile.
- **Console Layouts:** Two primary views dominate:
  1. *Master-Detail Split:* 320px persistent left sidebar (graph explorer / test suites) paired with an expansive fluid primary workbench.
  2. *Tri-pane Inspector:* File and node hierarchy (260px), terminal/code execution view (flexible center), and causal verification drawer (360px pinned right).
- **Responsive Adaptations:**
  - *Desktop (>1024px):* Full 12-column execution layout, multi-pane drawers visible.
  - *Tablet (768px - 1023px):* Inspector panes collapse to slide-over sheets, margins reduce to `margin-md` (1.5rem).
  - *Mobile (<768px):* Single-column stacked arrangement. Inline metrics collapse to 2-column key-value summaries. Outer margin transitions to `margin` (1rem).

## Elevation & Depth

Depth is established primarily through crisp planar boundaries and subtle tonal separation rather than prominent drop shadows. This keeps visual hierarchy focused on raw technical data.

- **Tonal Layering:** The viewport uses canvas slate (`#f8fafc`). Elevated workbenches, interactive panels, and code inspection blocks use pure white (`#ffffff`). Secondary grouping containers inside cards use flat subtle slate (`#f1f5f9`).
- **Low-Contrast Outlines:** Every card, modal, and nested code view is bound by a clean 1px stroke of `#e2e8f0`. Highlighting an active state transitions the stroke directly to `#cbd5e1` or `#4f46e5`.
- **Micro-Shadows for Overlays:** Floating popovers, autocomplete suggestion menus, and modal dialogs utilize a minimal, cool-tinted ambient shadow:
  - *Dropdowns / Overlays:* `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`.
  - *Modals:* `0 12px 32px -4px rgba(15, 23, 42, 0.1), 0 4px 12px -2px rgba(15, 23, 42, 0.05)`.
- **No Heavy Skeuomorphism:** Keep surface planes flat, sharp, and clean. No frosted noise textures or thick drop-shadow offsets.

## Shapes

The design uses a restrained, soft geometric contour (`roundedness: 1`), conveying engineering reliability and modular precision.

- **Interactive Triggers & Inputs:** Standard buttons, form fields, tab headers, and badge indicators use `0.25rem` (4px) radii.
- **Cards & Data Modules:** Content containers, terminal execution boxes, and test output panels use `0.375rem` (6px) or `0.5rem` (8px via `rounded-lg`).
- **Pill Exceptions:** Rounded pills are strictly prohibited for cards and inputs. They are reserved exclusively for compact, inline verification tags and status indicators to differentiate discrete state flags from structural layout elements.

## Components

### Buttons & Interactive Controls
- **Primary:** `#4f46e5` background, `#ffffff` text, 0.25rem corner radius. Hover shifts to `#4338ca`. Active states compress subtly without 3D displacement.
- **Secondary / Ghost:** Transparent background with 1px border in `#e2e8f0`, text in `#334155`. Hover shifts background to `#f1f5f9` with border `#cbd5e1`.
- **Destructive:** Crimson border and text (`#e11d48`) with hover background of `#fff1f2`.

### Status Badges & Chips
- Status markers display exclusively in `JetBrains Mono` at `label-sm` (11px, bold, uppercase):
  - **`VERIFIED_SUCCESS`:** Background `#ecfdf5`, border 1px solid `#a7f3d0`, text `#059669`. Prepended with a 6px solid emerald dot.
  - **`UNVERIFIED`:** Background `#fffbeb`, border 1px solid `#fde68a`, text `#d97706`. Prepended with an amber hollow circle.
  - **`VERIFIED_FAILURE`:** Background `#fff1f2`, border 1px solid `#fecdd3`, text `#e11d48`. Prepended with a crimson cross icon.
- Badges use pill-style radius (`9999px`) with padding `2px 8px`.

### Cards & Metrics
- **Metric Card:** Pure white background (`#ffffff`), 1px outline (`#e2e8f0`), 0.5rem radius, padding `1rem`. Top row displays monospaced property title in `#64748b`; value displays prominently in `headline-md` `#0f172a`.
- **Graph Proposal Card:** Header row features solution ID (`sol_01...`), author/agent tag, and timestamp. Center section renders Cypher relation chain `(Problem)->[:SOLVED_BY]->(Solution)` in a syntax box (`#f1f5f9`), followed by collapsible verification traces.

### Form Inputs & Filters
- **Text Inputs:** Background `#ffffff`, border 1px solid `#e2e8f0`, text `#0f172a`, font `14px Geist`. Focus ring: 1px `#4f46e5` with a 2px outer aura in `rgba(79, 70, 229, 0.15)`.
- **Search & Filter Bars:** Inline keyboard shortcut affordance rendered as a monospaced badge (`⌘K` or `/`) on the right side in `#94a3b8`.

### Code & Terminal Blocks
- Background `#f8fafc`, bordered by `#e2e8f0`. Header bar styled in `#f1f5f9` with file path in `code-inline`, copy action button, and execution state indicator. 
- Line numbers styled in `#94a3b8` with subtle separator border. Code text renders in `JetBrains Mono` (`#0f172a`) with light syntax highlighting (`#0284c7`, `#4f46e5`, `#059669`).