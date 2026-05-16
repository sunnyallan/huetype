# Huetype Frontend — Claude Instructions

These rules apply to every code change made in this project.

## Hover interactions

- **Border, not shadow.** All card and button hover states use a border reveal
  (`border border-transparent hover:border-ht-line`) rather than a box-shadow.
  Shadows are not visible enough in the light theme.

- **Always ease-in-out.** Every hover transition — background colour, border,
  text colour — must include `transition-colors duration-200 ease-in-out` (or
  `transition-all` when multiple properties change together).

- **Icon palette changes must crossfade.** CSS cannot interpolate between two
  `@font-palette-values` names directly, so icon colour transitions are done by
  stacking two `<HueIcon>` elements (rest palette + hover palette) and
  crossfading their `opacity`:

  ```tsx
  // Rest icon — fades out on hover
  <HueIcon palette={restPalette} style={{ position: "absolute", opacity: hovered ? 0 : 1, transition: "opacity 300ms ease-in-out" }} />
  // Hover icon — fades in on hover
  <HueIcon palette={hoverPalette} style={{ position: "absolute", opacity: hovered ? 1 : 0, transition: "opacity 300ms ease-in-out" }} />
  ```

  Wrap both in a `relative` container sized to the icon dimensions. Use
  `useState` + `onMouseEnter/onMouseLeave` to drive the `hovered` flag.
  Duration should match the button/card transition (default `300ms`).

## Icon palettes

- Named `@font-palette-values` live in `src/app/globals.css`.
- The `HuePalette` union type lives in `src/components/hue-icon.tsx` — extend
  it whenever a new palette is added to CSS.
- **Always assign the correct palette per call-site context** (icon background
  colour matters). Do not use a single palette everywhere.
- Current palettes and their intended contexts:

  | Name       | Slots (0 / 1 / 2)                | Use when                              |
  |------------|----------------------------------|---------------------------------------|
  | `default`  | Font's own CPAL                  | Illustration & Tri-tone icons         |
  | `duo`      | #b8b7b7 / #000000 / #d9d9d9     | Duo-tone icon at rest                 |
  | `arrow`    | #000000 / #000000 / #b7b7b7     | Go-arrow / directional icons          |
  | `ref`      | #d9d9d9 / #b8b7b7 / #17181c    | General icons on white/surface bg     |
  | `brand`    | #e2ec5b / #7c6af5 / #ff6b9d    | Hover state — reveals brand colours   |
  | `ink`      | #17181c / #17181c / #17181c    | Fully monochrome on any bg            |
  | `ink-lime` | #17181c / #eefa94 / #17181c    | Dark + lime accent                    |
  | `light-lime` | #f3f3f3 / #eefa94 / #f3f3f3  | Icons on dark ink backgrounds         |
  | `ref-inv`  | #ffffff / #c8c8c8 / #eefa94    | Inverted — icon on dark bg hover      |
  | `mint`     | #b8d4c4 / #e9eeea / #6fbf73    | Soft green, profile/avatar context    |
  | `grey-two` | #17181c / #9aa0a6 / #17181c    | Two-tone dark on any bg               |

## Theme scoping

- The post-login light theme is scoped under `.ht-app` on the dashboard `<main>`.
- The landing page uses the legacy dark theme — never apply `ht-*` classes there.
