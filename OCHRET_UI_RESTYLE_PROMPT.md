# OCHRET / Radio Noise Map — UI Restyle + Frequency Presets

You are working with an existing Angular + Leaflet application.

Do **not** rebuild the app from scratch.

Refactor and extend the current UI using the existing architecture, services, Angular signals, components, and data model.

---

## Current App

The app is called **Radio Noise Map** and monitors radio-electronic noise / EW activity on a Leaflet map.

Current structure:

```txt
src/app/
├── models/
│   └── noise-reading.model.ts
├── services/
│   ├── radio-noise.service.ts
│   └── ui-state.service.ts
└── components/
    ├── map/
    ├── frequency-list/
    ├── frequency-detail/
    ├── emission-form/
    └── legend/
```

Current data model:

```ts
export type NoiseLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Band = 'UHF' | 'L-BAND' | 'S-BAND' | 'C-BAND' | 'X-BAND';

export interface NoiseReading {
  id: string;
  lat: number;
  lng: number;
  h3Index: string;
  frequency: number;
  noiseLevel: NoiseLevel;
  usage: number;
  band: Band;
  notes?: string;
  timestamp: Date;
  color: string;
}
```

Current services:
- `RadioNoiseService` uses Angular signals and localStorage key `rnm_v3`.
- `UiStateService` manages `selectedId`, `editingId`, `mapPending`, and `formMode`.
- `formMode = null` shows the detail panel.
- `formMode = 'add' | 'edit'` shows the emission form.

Keep this behavior.

---

# Goal

Restyle the app into a retro-futuristic tactical EW interface using the **OCHRET** visual identity.

The design should feel like:

- military EW console
- field command tablet
- radio spectrum monitoring system
- graphite tactical dashboard
- retro-futuristic avionics equipment

Do **not** use dark blue as the main UI color.

Use:

- graphite
- charcoal
- dark gray
- matte black
- orange signal accents
- cream text
- muted cyan for LOW / technical highlights

Avoid:

- generic SaaS UI
- bright cyberpunk neon
- glassmorphism
- pure blue dark mode

---

# Required UI Changes

## 1. Global Theme

Create or update global SCSS variables.

Use this palette:

```scss
:root {
  --ochret-orange: #F05A28;
  --ochret-orange-soft: #FF7A45;
  --ochret-orange-dark: #B93D16;

  --graphite-950: #0B0C0D;
  --graphite-900: #111315;
  --graphite-850: #171A1D;
  --graphite-800: #1D2125;
  --graphite-750: #23282D;
  --graphite-panel: rgba(28, 32, 36, 0.94);

  --ochret-cream: #E8DDB5;

  --steel-gray: #5F6870;
  --steel-light: #8A949D;

  --signal-cyan: #5FAFC4;
  --signal-cyan-dim: #3B7C8E;

  --noise-low: #4FAFCB;
  --noise-medium: #D8A247;
  --noise-high: #F05A28;

  --border-soft: rgba(255, 255, 255, 0.08);
  --border-orange: rgba(240, 90, 40, 0.42);
  --panel-glow: rgba(240, 90, 40, 0.12);
}
```

Use mono typography:

- IBM Plex Mono
- Space Mono
- Share Tech Mono

If fonts are not installed, use fallbacks:

```scss
font-family: 'IBM Plex Mono', 'Space Mono', 'Share Tech Mono', monospace;
```

Typography style:

```scss
letter-spacing: 0.08em;
text-transform: uppercase;
font-weight: 500;
```

---

## 2. App Header

Update the header to feel like a tactical console.

Header content:

- OCHRET logo / text mark
- title: `RADIO NOISE MAP`
- subtitle: `Моніторинг РЕО`
- status indicator: `LINK: SECURE`
- time indicator
- `EXPORT CSV` button

Header style:

- graphite background
- cream typography
- orange accents
- subtle bottom border
- compact military-console layout

---

## 3. Map Area

Keep the existing Leaflet integration.

Restyle map overlays:

- graphite / dark terrain look
- subtle vignette around map
- low-opacity grid
- map controls styled as graphite buttons with cream icons and orange hover

Existing circle markers should use the new noise colors:

- LOW: cyan
- MEDIUM: amber
- HIGH: orange

Circle styling:

- low opacity fill
- stronger border
- glow-like appearance if possible
- HIGH should look more urgent

---

## 4. Sidebar

Current sidebar width can remain around `260px`, but it can be increased to `300–340px` if needed.

Sidebar should contain:

- frequency list on top with `flex: 1`
- bottom panel with fixed height around `300–340px`
- bottom panel conditionally renders detail or form

Style:

- graphite panel background
- cream section headers
- thin orange separators
- soft inner shadows
- subtle grain / scanline overlay

---

## 5. Frequency List

Restyle `frequency-list`.

Each item should show:

- frequency in MHz
- band
- noise level
- timestamp
- action menu `⋮`

Example row:

```txt
2400 MHz    S-BAND
HIGH        15:01
```

Active selected item:

- orange left border
- dark graphite background
- soft orange glow
- cream text

Noise badges:

- LOW: cyan
- MEDIUM: amber
- HIGH: orange

Empty state:

```txt
NO ACTIVE EMISSIONS
Click map to add.
```

---

## 6. Frequency Detail Panel

Restyle `frequency-detail`.

Show:

- frequency as large orange value
- band
- noise level badge
- usage progress bar
- timestamp
- notes

Add optional tactical details:

- small radar circle visual
- small signal bars
- low-opacity hex pattern background

Do not change business logic.

---

## 7. Emission Form

Restyle `emission-form`.

Keep existing add/edit behavior.

Fields:

- frequency
- noise level
- usage
- notes

Add a **Frequency Presets** block inside the form.

Preset buttons:

```txt
433
700
868
900
1200
2400
3100
3300
5800
8500
```

Clicking a preset should:

- set the frequency field
- update the band automatically through existing `getBand()`
- keep the form in the current add/edit mode

Preset UI:

- small tactical pill buttons
- graphite background
- cream text
- orange border on hover
- orange filled / active state when selected

---

## 8. Band Mapping

Keep the existing `getBand(mhz)` behavior:

```txt
< 1000       → UHF
1000–1999    → L-BAND
2000–3999    → S-BAND
4000–7999    → C-BAND
>= 8000      → X-BAND
```

Do not introduce incompatible band values unless the model is updated safely.

---

## 9. Buttons

Primary buttons:

- graphite background
- orange border
- cream text
- orange glow on hover

Confirm button:

- orange background
- cream / white text

Cancel button:

- dark graphite background
- steel border
- steel-light text

Danger / delete actions:

- use orange-red carefully

---

## 10. CSS Effects

Add subtle effects only:

- scanline overlay
- grain texture
- vignette
- soft orange glow
- low-opacity hex pattern

Do **not** make the UI visually noisy.

Readability is more important than decoration.

---

# UI Atmosphere

The interface should feel like:

- battlefield RF monitoring system
- EW tactical operations platform
- military signal intelligence console
- field command equipment

This is not a generic dashboard.

It is a defense-tech operational interface.

---

# Implementation Requirements

- Keep Angular signals.
- Keep localStorage key `rnm_v3`.
- Keep current service logic unless required for presets.
- Keep current component structure.
- Do not rewrite the whole app.
- Prefer SCSS refactor and component-level styling.
- Add frequency presets cleanly to `emission-form`.
- Keep map click flow:
  - click map
  - `startAdd(lat, lng)`
  - sidebar switches to form
  - confirm saves reading
  - cancel returns to detail

---

# Expected Output

Update the Angular project with:

1. refreshed graphite / OCHRET theme
2. restyled header
3. restyled map overlays and controls
4. restyled sidebar
5. restyled frequency list
6. restyled frequency detail panel
7. restyled emission form
8. added frequency preset buttons
9. preserved existing app behavior

After implementing, summarize:

- changed files
- added presets
- any assumptions
- how to run the app
