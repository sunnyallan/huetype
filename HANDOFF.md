# Hue Type — Handoff Doc

Last updated: 2026-05-15

## What this is

**Hue Type** is a multi-colour icon font builder. Users upload SVGs, pick a font type
(illustration / duo-tone / tri-tone) and a global palette, and we build an OpenType
COLR/CPAL v1 font (WOFF2 + TTF) they can download and use anywhere via CSS `font-palette`.

---

## Architecture

- **Backend**: FastAPI on Render.com — `https://huetype-api.onrender.com`
  - Repo: `/Users/apple/Documents/huetype/huetype-backend`
  - Builds fonts with `nanoemoji` + `picosvg`
  - Auth via Supabase JWT (JWKS, supports ES256 + HS256)
  - **Render free plan = cold starts** (~30s spin-up). Frontend has a themed loader.
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind v3 + TypeScript
  - Repo: `/Users/apple/Documents/huetype/huetype-frontend`
  - Dev: `cd huetype-frontend && npm run dev` → http://localhost:3000
  - Deploy target: Vercel (free plan)
  - Latest commit on `main`: `b662f27`
- **Supabase**: `https://wwowqtjyptrytqivmdji.supabase.co`
  - Postgres + Storage (`svgs/`, `fonts/`) + Auth; RLS on all tables
- **Test login**: `test@huetype.com` / `Test1234!`

---

## Current state — fully working

- Project create wizard (font type selection overlay + palette)
- SVG upload with client+server validation (1:1 ratio, ≤N colours, no gradients)
- Split-panel project page: left = dropzone + glyph grid, right = edit panels
- Per-glyph edit (name / codepoint / colour swatches / replace SVG / delete)
- Font build → WOFF2 + TTF download (dropdown)
- **Live preview before save**: colour edits in right panel instantly update left-grid cards
  - Illustration: edited SVG is pushed via `onLivePreviewChange`
  - Duo/tri: palette dirty-flag forces SVG recolour path on all cards
- **Palette reset**: "Reset" button appears in Type Colours row when unsaved; reverts to `project.palette`
- **Background colour live preview**: previewBg now applies to the glyph card itself (not an inner div)
- **FontFace API font loading**: no swap flash — old font stays rendered until new build is parsed
- Dashboard project cards: skeleton loader while font fetches, FontFace API for no-flicker preview
- Landing page with full SEO (JSON-LD, OG image, sitemap, robots)

---

## Key files

### Frontend
| File | Purpose |
|---|---|
| `src/lib/api.ts` | Typed API client |
| `src/lib/svg-validate.ts` | Client-side SVG validation (mirror of backend) |
| `src/lib/svg-recolour.ts` | Client-side SVG recolour (`recolourSvg`, `svgToDataUrl`) |
| `src/lib/use-project-font.ts` | Dashboard font cache hook — FontFace API, CPAL extraction, hue rotation |
| `src/app/dashboard/dashboard-client.tsx` | Project list, New Type wizard, project cards with FontFace preview |
| `src/app/projects/[id]/project-client.tsx` | Split-panel project page (all editing logic) |
| `src/components/hue-icon.tsx` | HueType icon font component + `HuePalette` type |
| `src/components/loader.tsx` | Font-themed loader (HueType glyphs, 4 cycling palettes) |
| `src/app/globals.css` | All `@font-palette-values` rules + `.ht-size-slider` |
| `src/middleware.ts` | Auth gate |

### Backend
| File | Purpose |
|---|---|
| `services/svg_recolor.py` | Group-aware hybrid recolour (`recolor_svg_smart`) |
| `services/nanoemoji_runner.py` | Font build pipeline; calls `recolor_svg_smart` for duo/tri |
| `services/auth.py` | JWKS-based JWT (ES256 + HS256) |
| `routers/glyphs.py` | Upload / edit / replace / delete with validation |
| `routers/jobs.py` | Font builds via BackgroundTasks |

---

## Named palettes (globals.css → hue-icon.tsx HuePalette type)

| CSS name | Slots (0 / 1 / 2) | Use when |
|---|---|---|
| `--ht-default` | Font's own CPAL | Illustration & Tri-tone icons |
| `--ht-duo` | #b8b7b7 / #000000 / #d9d9d9 | Duo-tone icon at rest |
| `--ht-arrow` | #000000 / #000000 / #b7b7b7 | Go-arrow / directional |
| `--ht-ref` | #d9d9d9 / #b8b7b7 / #17181c | General icons on white/surface |
| `--ht-brand` | #e2ec5b / #7c6af5 / #ff6b9d | Hover — brand vivid |
| `--ht-ink` | #17181c × 3 | Fully monochrome |
| `--ht-light-lime` | #f3f3f3 / #eefa94 / #f3f3f3 | Icons on dark bg |
| `--ht-ref-inv` | #ffffff / #c8c8c8 / #eefa94 | Inverted on dark bg |
| `--ht-icon` | **#000000 / #b7b7b7 / #d9d9d9** | Close & Edit icons at rest |
| `--ht-close-hover` | **#ff6b9d / #e2ec5b / #7c6af5** | Close icon hover |
| `--ht-edit-hover` | **#7c6af5 / #ff6b9d / #e2ec5b** | Edit icon hover |

### Icon hover crossfade pattern

Two stacked `<HueIcon>` elements inside a relative `<span>` — opacity
crossfades 300ms ease-in-out. Implemented in `IconHoverBtn` in `project-client.tsx`.
**Never** set `width`/`height` on the outer `<button>` — size comes from `className`.

---

## Glyph reference (U+E001–E00C)

| Codepoint | Name | Semantic |
|---|---|---|
| E001 | illustration | overlapping circles |
| E002 | triTone | pie chart |
| E003 | goArrow | diagonal arrow |
| E004 | upload | cloud + up-arrow |
| E005 | duoTone | half-moon |
| E006 | edit | pencil |
| E007 | download | file + down-arrow |
| E008 | add | plus circle |
| E009 | remove | tag × |
| E00A | newType | Aa in frame |
| E00B | close | × circle |
| E00C | swap | swap arrows |

---

## Design rules (CLAUDE.md)

- **Hover**: border reveal only (`border-transparent hover:border-ht-line`), no shadow
- **Transitions**: always `ease-in-out`, `duration-200` (or `300ms` for icon crossfade)
- **Icon palette change**: must use opacity crossfade (two stacked icons), never instant swap
- **Theme scope**: `.ht-app` on dashboard/project `<main>` activates light theme; landing stays dark

---

## Project page specifics

### Font loading (project page)
- Family name: `HueTypeProjectFont-<jobId-prefix>` (unique per build)
- FontFace API (`new FontFace(family, buf)` → `face.load()` → `document.fonts.add()`)
- Previous build's font stays rendered until new one is parsed → zero flash on rebuild
- `currentFontFamily` state (not a boolean `fontReady`) holds the active family name

### GlyphCard rendering priority
1. Built font (if `isInCurrentBuild && !forceLivePreview`) — crisp COLR rendering
2. Live SVG (`livePreviewSvg` from right panel) — illustration colour edits
3. Recoloured SVG (fetched + recoloured with `palette`) — duo/tri palette dirty state
4. Raw SVG URL — illustration no-edit state
5. "Build to preview" text

### Size slider
- Custom `SizeSlider` component (not native input). Grey pill + lime fill (`overflow-hidden` parent clips correctly). No thumb. Range: **24–50px**, default **24px**.
- Invisible `<input type="range">` overlay handles interaction.

---

## Gotchas / things to remember

- **Cold starts**: First API call after idle ~30s. Loader has long-wait at 4s.
- **nanoemoji filenames**: Must be `emoji_u<lowercase hex>.svg`.
- **PUA codepoint range**: U+E001–U+F8FF only.
- **SVG colour extraction**: `extractSvgColours` captures ALL fill values including named
  colours (`black`, `white`). `cssColourToHex` normalises via canvas. `svgOriginals[]`
  holds the raw attr strings for replacement; `svgColours[]` holds normalised hex baseline.
- **document.fonts.check()** is unreliable for unknown families (returns `true` via
  fallback). Always iterate `document.fonts.forEach` to check if a face is loaded.
- **IconHoverBtn size**: Never set `width`/`height` on the button element — only on the
  inner `<span>` wrapper. Otherwise padding from `className` is ignored.
- **Supabase SSR cookies**: types from `CookieOptions` import required for TS.
- **git add with `[id]`**: always quote the path: `git add "src/app/projects/[id]/..."`.

---

## Commands

```bash
# Frontend dev
cd /Users/apple/Documents/huetype/huetype-frontend && npm run dev

# Typecheck
cd /Users/apple/Documents/huetype/huetype-frontend && npx tsc --noEmit

# Backend (Render auto-deploys main on push)
cd /Users/apple/Documents/huetype/huetype-backend && git push
```

---

## How to resume

Paste into a new chat:

> Read `/Users/apple/Documents/huetype/HANDOFF.md`. Continue working on the
> Hue Type frontend. Latest frontend commit: `b662f27` on `main`.
> Repo: `/Users/apple/Documents/huetype/huetype-frontend`.
