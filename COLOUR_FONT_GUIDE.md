# Hue Type — Colour Font Implementation Guide

A thorough reference for **designers** and **developers** on how to use the fonts produced by Hue Type, which browsers and tools support them, how to implement CSS colour-font features, and how SBIX works for Safari/iOS.

---

## Table of Contents

1. [What Hue Type produces](#1-what-hue-type-produces)
2. [Preparing SVGs for a colour font](#2-preparing-svgs-for-a-colour-font)
3. [For Designers](#3-for-designers)
   - [Installing your font on macOS](#installing-your-font-on-macos)
   - [Using in Figma](#using-in-figma)
   - [Using in Adobe Illustrator & other apps](#using-in-adobe-illustrator--other-apps)
   - [Choosing the right file](#choosing-the-right-file)
4. [For Developers](#4-for-developers)
   - [@font-face setup](#font-face-setup)
   - [Using glyphs in HTML](#using-glyphs-in-html)
   - [CSS font-palette — the basics](#css-font-palette--the-basics)
   - [Defining custom palettes with @font-palette-values](#defining-custom-palettes-with-font-palette-values)
   - [Hover crossfade pattern](#hover-crossfade-pattern)
   - [Inline glyphs in body text](#inline-glyphs-in-body-text)
   - [Animations](#animations)
   - [Text on a path (SVG)](#text-on-a-path-svg)
5. [Browser & Platform Support](#5-browser--platform-support)
6. [SBIX vs COLRv1 — explained](#6-sbix-vs-colrv1--explained)
7. [Safari & iOS — the full picture](#7-safari--ios--the-full-picture)
8. [Safari fallback — the production pattern](#8-safari-fallback--the-production-pattern)
9. [React / Next.js Integration](#9-react--nextjs-integration)
10. [File Size & Performance](#10-file-size--performance)
11. [Format Comparison Table](#11-format-comparison-table)
12. [FAQ](#12-faq)

---

## 1. What Hue Type produces

Every Hue Type build job outputs **three files**:

| File | Format | Use for |
|---|---|---|
| `yourfont.woff2` | COLRv1 WOFF2 | Websites (Chrome, Firefox, Edge) |
| `yourfont.ttf` | COLRv1 TTF | Design tools that need TTF; Chromium apps |
| `yourfont-safari.ttf` | COLRv1 + SBIX TTF | Safari, iOS, macOS Figma |

The **WOFF2** file is the right choice for almost all web use — it is compressed (~40% smaller than TTF) and supported in all modern Chromium/Gecko browsers.

The **Safari TTF** contains both the COLRv1 colour tables (for future Safari support) and an **SBIX table** with PNG bitmaps at 20 px, 40 px, 80 px, and 160 px so your icons look sharp at 1×–4× retina on any Apple device today.

---

## 2. Preparing SVGs for a colour font

How the 3-slot palette model works, and how to structure your source SVGs so they recolour predictably.

### The 3-slot CPAL model

A COLR / CPAL colour font stores each icon as a **stack of vector shapes**. Each shape is assigned a "slot" in a tiny palette table that ships with the font. Hue Type uses **3 slots** per glyph.

| Slot | Z-order | Typical role |
|---|---|---|
| **0** | Bottom (rendered first) | Background / fill plate |
| **1** | Middle | Mid layer / accent |
| **2** | Top (rendered last) | Foreground detail (lines, dots, glyph faces) |

### How nanoemoji maps your SVG to slots

When you upload an SVG to Hue Type, the build pipeline (nanoemoji) walks every path and groups shapes by their **fill colour**. Each unique fill colour becomes one CPAL slot:

- Slot 0 ← the colour of the **first** shape in your SVG source
- Slot 1 ← the colour of the next unique shape
- Slot 2 ← the colour of the next unique shape

The actual hex values you pick **don't matter for CSS** — they're placeholders. CSS `font-palette` overrides replace them at runtime. What matters is that you use exactly **three distinct colours**, and that the SVG source order matches the z-order you want.

### Example: a 3-layer "Close" icon

```xml
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <!-- Slot 0 — outer circle (background) -->
  <circle cx="12" cy="12" r="11" fill="#b7b7b7"/>

  <!-- Slot 1 — inner ring (mid layer) -->
  <circle cx="12" cy="12" r="9"  fill="#d9d9d9"/>

  <!-- Slot 2 — X mark (foreground) -->
  <path d="M8,8 L16,16 M16,8 L8,16"
        stroke="#000000" stroke-width="2.5" fill="none"/>
</svg>
```

Three shapes, three fills, three slots. The font built from this SVG can later be recoloured with any palette — for example brand vivid:

```css
@font-palette-values --brand {
  font-family: "MyIcons";
  override-colors:
    0 #7c6af5,   /* slot 0: was #b7b7b7 → now purple */
    1 #e2ec5b,   /* slot 1: was #d9d9d9 → now lime   */
    2 #ff6b9d;   /* slot 2: was #000000 → now pink   */
}
```

The icon's **structure** stays the same — only the colours change. Ship one SVG, recolour it for dark mode, hover states, brand swaps, etc., without rebuilding the font.

### Design rules for predictable results

1. **Exactly 3 distinct fill colours.** A 4th will be merged or rejected.
2. **Use placeholder values that are easy to spot in source.** Recommended: `#000000` / `#7c7c7c` / `#d9d9d9`, or pure primary R/G/B.
3. **No gradients.** Gradients get flattened to a single fill. Convert to solids before export.
4. **Convert strokes to filled paths** (Object → Outline Stroke in Figma / Illustrator). Strokes have ambiguous slot mapping.
5. **Source order matters.** The first shape with colour X establishes that colour's slot index. Reorder layers in your design tool to match the intended z-order before exporting.
6. **One icon per SVG, all at the same artboard size.** Hue Type recommends 24×24 or 64×64.
7. **Filename = the icon's semantic name** (`download.svg`, `close.svg`, etc.) — these become the glyph names inside the font.

### Figma export checklist

- Boolean ops resolved (no compound paths with mixed fills)
- Strokes outlined → filled paths
- All fills set to one of your three chosen placeholders
- Export → SVG → uncheck "Include 'id' attribute" (smaller files)
- Drop all SVGs as one batch into Hue Type's upload zone

### What CSS designers see

Once the font is built, every developer who uses it can recolour your icons live in the browser with `@font-palette-values` + `font-palette` (see [For Developers](#4-for-developers)). Your job as the source designer ends at the SVG: pick clean 3-colour layers, structure them in the right z-order, and ship.

---

## 3. For Designers

### Installing your font on macOS

1. Download `yourfont-safari.ttf` from Hue Type (this version works on macOS).
2. Double-click the `.ttf` file → click **Install Font** in Font Book.
3. The font installs system-wide and appears in every app (Figma, Sketch, Illustrator, Pages, etc.).

> **Why the Safari TTF, not the WOFF2?**  
> WOFF2 is a web-only container format. macOS apps use TTF/OTF. The Safari TTF is the one that contains SBIX bitmaps, which makes glyphs visible in all macOS apps regardless of COLRv1 support.

---

### Using in Figma

#### Desktop app (macOS)
1. Install `yourfont-safari.ttf` via Font Book (steps above).
2. In Figma Desktop, select a text layer → open the font picker → search for your font name.
3. The glyphs render using the SBIX bitmaps — they look exactly like the PNG source files.

#### Figma Web (browser)
- Figma Web runs in Chrome, which supports COLRv1. Install via Figma's **local fonts** helper (`Desktop App → Preferences → Enable local fonts`), or use [Figma Font Helper](https://help.figma.com/hc/en-us/articles/360039956894).
- With the font installed locally, type the glyph character or paste it from the Hue Type app — it renders in full colour.

#### Typing glyphs in Figma
Each icon is a Unicode **Private Use Area (PUA)** character (U+E001 through U+E00C). The easiest way to use them:
- Copy the character from the Hue Type preview panel and paste it into Figma.
- Or: in a text layer, use **Insert Special Character** (macOS: `⌃ ⌘ Space`) and search by name if your font maps glyph names.

#### Resizing icons in Figma
Colour font glyphs scale exactly like text — drag the font size handle or type a value. Unlike SVG, there is no `viewBox` to worry about.

#### Changing colours in Figma
- Figma Desktop (macOS): the SBIX bitmaps are fixed-colour PNGs. To recolour, re-export from Hue Type with a different palette.
- Figma Web / Chrome: COLRv1 is live — you can apply CSS `font-palette` via the Inspect panel's CSS output, but Figma's own UI doesn't expose `font-palette` as a layer property yet. Recolouring in Figma for COLRv1 is not yet supported through the GUI; use CSS for web output.

---

### Using in Adobe Illustrator & other apps

Illustrator (2024+) supports SBIX colour fonts on macOS. After installing `yourfont-safari.ttf`:
1. Create a text object, set the font to your Hue Type font.
2. Type or paste the PUA character. It renders as a coloured bitmap.
3. Scale freely — Illustrator renders from the highest-resolution SBIX strike (160 px) and scales up/down.

**Sketch**: Same as Figma Desktop — install font, paste character, it renders.

**Affinity Designer 2**: Supports SBIX on macOS. Same steps.

**Microsoft Word / Office**: COLRv1 not supported. SBIX support varies by version. Best practice: export individual PNGs for Office use.

---

### Choosing the right file

```
Building a website?  → yourfont.woff2   (COLRv1, CSS font-palette)
Design work on Mac?  → yourfont-safari.ttf  (SBIX bitmaps, works everywhere on macOS)
Chromium app / Electron? → yourfont.ttf  (COLRv1 TTF)
iOS app (UIFont)?    → yourfont-safari.ttf  (SBIX is natively rendered by CoreText)
```

---

## 4. For Developers

### @font-face setup

Load your font with a standard `@font-face` declaration. Use `woff2` for web — it's compressed and widely supported:

```css
@font-face {
  font-family: "MyIcons";
  src: url("/fonts/yourfont.woff2") format("woff2");
  font-display: block; /* prevents invisible text flash during load */
}
```

If you need broad browser support including older browsers, add a TTF fallback:

```css
@font-face {
  font-family: "MyIcons";
  src:
    url("/fonts/yourfont.woff2") format("woff2"),
    url("/fonts/yourfont.ttf")   format("truetype");
  font-display: block;
}
```

> `font-display: block` is recommended for icon fonts — a brief invisible state is better than a flash of fallback characters.

---

### Using glyphs in HTML

Each icon is a Unicode character in the Private Use Area. Render it inside any inline element:

```html
<!-- Span is the most common wrapper -->
<span style="font-family: MyIcons; font-size: 24px;" aria-hidden="true">&#xE001;</span>

<!-- Or use the character directly if your source file is UTF-8 -->
<span class="icon" aria-hidden="true"></span>
```

Always add `aria-hidden="true"` — these are decorative PUA characters with no semantic meaning to screen readers. Pair every icon with a visible text label or `aria-label` on the parent button.

```html
<!-- Accessible button example -->
<button aria-label="Download">
  <span class="icon" aria-hidden="true"></span>
  <span class="btn-label">Download</span>
</button>
```

---

### CSS font-palette — the basics

`font-palette` is the CSS property that controls which colour palette a COLRv1 font uses:

```css
/* Use the font's built-in default palette */
.icon {
  font-family: MyIcons;
  font-palette: normal;   /* default — uses CPAL palette index 0 */
}

/* Use a named palette you define yourself (see next section) */
.icon-brand {
  font-palette: --brand-colors;
}
```

**Browser support for `font-palette`:**
- Chrome 101+ ✓
- Firefox 107+ ✓
- Edge 101+ ✓
- Safari: ✗ (property is parsed but COLRv1 glyphs don't render — see Safari section)

---

### Defining custom palettes with @font-palette-values

`@font-palette-values` is a CSS at-rule that lets you name a palette and override individual colour slots:

```css
/* Define a named palette */
@font-palette-values --brand-colors {
  font-family: "MyIcons";  /* must match the font-family name exactly */
  base-palette: 0;          /* start from CPAL palette index 0 */
  override-colors:
    0 rgb(124, 106, 245),   /* slot 0 → purple */
    1 rgb(226, 236, 91),    /* slot 1 → lime */
    2 rgb(255, 107, 157);   /* slot 2 → pink */
}

/* Define a monochrome palette by overriding all slots to one colour */
@font-palette-values --icon-grey {
  font-family: "MyIcons";
  override-colors:
    0 #9aa0a6,
    1 #9aa0a6,
    2 #9aa0a6;
}

/* Apply a palette */
.icon { font-palette: --brand-colors; }
.icon-muted { font-palette: --icon-grey; }
```

**Key rules for `@font-palette-values`:**
- The `font-family` value inside the at-rule must exactly match the `font-family` in your `@font-face`.
- Slot indices (0, 1, 2…) correspond to the colour layers in the font's CPAL table — your Hue Type fonts use 3 slots.
- `base-palette` is optional; it defaults to 0 (the font's first CPAL palette).
- You only need to override the slots you want to change — unspecified slots inherit from the base palette.

---

### Hover crossfade pattern

CSS cannot animate directly between two `font-palette` values (interpolation isn't supported yet). The clean workaround: stack two copies of the icon and crossfade their opacity.

```css
.icon-wrap {
  position: relative;
  display: inline-flex;
  width: 24px;
  height: 24px;
}

.icon-rest,
.icon-hover {
  position: absolute;
  inset: 0;
  transition: opacity 300ms ease-in-out;
}

/* Rest state */
.icon-rest   { opacity: 1; font-palette: --icon-grey; }
.icon-hover  { opacity: 0; font-palette: --brand-colors; }

/* Hover state */
.icon-wrap:hover .icon-rest  { opacity: 0; }
.icon-wrap:hover .icon-hover { opacity: 1; }
```

```html
<span class="icon-wrap" aria-hidden="true">
  <span class="icon icon-rest"></span>
  <span class="icon icon-hover"></span>
</span>
```

**In React (with Tailwind):**

```tsx
function IconHoverBtn({ glyph, size = 16, restPalette, hoverPalette }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <HueIcon
        glyph={glyph} size={size} palette={restPalette}
        style={{ position: "absolute", inset: 0, transition: "opacity 300ms ease-in-out", opacity: hovered ? 0 : 1 }}
      />
      <HueIcon
        glyph={glyph} size={size} palette={hoverPalette}
        style={{ position: "absolute", inset: 0, transition: "opacity 300ms ease-in-out", opacity: hovered ? 1 : 0 }}
      />
    </span>
  );
}
```

---

### Inline glyphs in body text

Because font glyphs are just characters, they flow naturally inside any text:

```css
/* Make sure the font stack includes your icon font */
.rich-text {
  font-family: "Inter", sans-serif;
}

/* The icon character forces a font switch mid-line */
.rich-text .icon {
  font-family: "MyIcons";
  font-size: 1em;          /* matches surrounding text size */
  line-height: inherit;
  vertical-align: middle;
  font-palette: --brand-colors;
}
```

```html
<p class="rich-text">
  Design <span class="icon" aria-hidden="true"></span> systems that
  scale <span class="icon" aria-hidden="true"></span> and delight users.
</p>
```

Icons resize automatically with the surrounding text — perfect for headings, callout cards, and marketing copy.

---

### Animations

Since palette cycling is just a state change (not a CSS property interpolation), the cleanest animation approach uses JavaScript to cycle a class:

```css
@font-palette-values --pal-0 { font-family: "MyIcons"; override-colors: 0 #7c6af5, 1 #e2ec5b, 2 #ff6b9d; }
@font-palette-values --pal-1 { font-family: "MyIcons"; override-colors: 0 #dc5032, 1 #f3ba12, 2 #ffa0be; }
@font-palette-values --pal-2 { font-family: "MyIcons"; override-colors: 0 #14a0a6, 1 #a0f0d2, 2 #38bdf8; }
```

```tsx
const PALETTES = ["--pal-0", "--pal-1", "--pal-2"];

function AnimatedIcon({ glyph }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PALETTES.length), 800);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: "MyIcons", fontPalette: PALETTES[idx], fontSize: 32 }}>
      {glyph}
    </span>
  );
}
```

For the "active glyph" spotlight effect (one icon lit up while others dim):

```tsx
const GLYPHS = ["", "", "", ""];

function Loader() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % GLYPHS.length), 350);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {GLYPHS.map((g, i) => (
        <span
          key={i}
          style={{
            fontFamily: "MyIcons",
            fontPalette: "--pal-0",
            fontSize: 36,
            opacity: i === active ? 1 : 0.18,
            transform: i === active ? "scale(1)" : "scale(0.78)",
            transition: "opacity 300ms, transform 300ms",
          }}
        >{g}</span>
      ))}
    </div>
  );
}
```

---

### Text on a path (SVG)

Combine HueType glyphs with SVG `<textPath>` for decorative animated backgrounds:

```html
<svg viewBox="0 0 800 120" style="width: 100%;">
  <defs>
    <path id="wave" d="M0,60 Q200,20 400,60 Q600,100 800,60"/>
  </defs>
  <text
    font-family="MyIcons"
    font-size="24"
    font-palette="var(--pal-0)"
    opacity="0.15"
  >
    <textPath href="#wave">
      <animate
        attributeName="startOffset"
        from="0%" to="100%"
        dur="18s"
        repeatCount="indefinite"
      />
      &#xE001;  &#xE002;  &#xE005;  &#xE00A;  &#xE003;  &#xE004;  &#xE007;
    </textPath>
  </text>
</svg>
```

The `<animate>` element uses SMIL (supported in Chrome, Firefox, Safari) — no JavaScript needed.

> **Note:** `font-palette` inside SVG attributes is not yet widely supported. Use `fontPalette` as an inline style attribute instead, or define colours via the `fill` attribute on the text element (which overrides all COLR layers uniformly).

---

## 5. Browser & Platform Support

### COLRv1 (`font-palette` CSS)

| Browser | Version | COLRv1 | Notes |
|---|---|---|---|
| Chrome | 98+ | ✓ | Full support |
| Edge | 98+ | ✓ | Chromium-based, same as Chrome |
| Firefox | 107+ | ✓ | Full support |
| Opera | 84+ | ✓ | Chromium-based |
| Samsung Internet | 20+ | ✓ | Chromium-based |
| Safari | All versions | ✗ | Not supported as of May 2026 |
| iOS Safari | All versions | ✗ | Not supported — all iOS browsers use WebKit |
| Chrome for iOS | All versions | ✗ | Uses WebKit on iOS — no COLRv1 |

**Global coverage:** ~72% of browser sessions (StatCounter, 2026)

### SBIX (bitmap colour font)

| Platform | Support | Notes |
|---|---|---|
| macOS | All modern versions | CoreText renders SBIX natively |
| iOS / iPadOS | All versions | CoreText, fully supported |
| Safari (macOS) | Yes (via font install) | SBIX in TTF renders correctly |
| Figma Desktop (macOS) | Yes | Uses CoreText |
| Adobe apps (macOS) | Illustrator 2024+, InDesign 2024+ | Bitmap glyphs visible |
| Chrome / Firefox | Partial | May render SBIX but prefers COLRv1 if available |
| Windows | Partial | DirectWrite supports SBIX in some versions |

### WOFF2 (container format, not colour-specific)

Supported in all modern browsers including Safari. The colour rendering depends on what's inside (COLRv1 vs SBIX), not the WOFF2 container itself. WOFF2 cannot contain SBIX (SBIX is a binary table not supported in WOFF2 spec), so SBIX always ships as TTF.

---

## 6. SBIX vs COLRv1 — explained

### COLRv1 (Colour and Gradients, version 1)

COLRv1 is a vector colour font format. It stores icons as **layered vector shapes**, each assigned a colour from a CPAL (Colour Palette) table. This is what `font-palette` in CSS controls.

**Advantages:**
- Infinitely scalable (vector)
- Tiny file size (~4 KB for 12 icons)
- Full CSS control via `font-palette` — recolour at runtime, animate, crossfade
- Single HTTP request for all icons

**Limitations:**
- Not supported in Safari / iOS (as of 2026)
- Complex gradients require COLRv1 (not COLRv0) — less compatible

### SBIX (Standard Bitmap Graphics)

SBIX stores PNG images directly inside the font file, one per glyph per pixel size (called "strikes"). The font contains strikes at multiple resolutions — typically 20 px, 40 px, 80 px, 160 px — and the OS renders the nearest-matching strike.

**Advantages:**
- Supported on all Apple platforms (macOS, iOS, iPadOS) via CoreText
- Pixel-perfect at defined strike sizes
- Works in every app that uses system font rendering (no CSS needed)

**Limitations:**
- Fixed colours — cannot be recoloured with CSS
- Larger file size (bitmap PNGs inside the font)
- No sub-pixel sharpness at non-strike sizes (nearest-neighbour scaling)
- Not animatable via CSS

### Which to use

| Scenario | Recommended format |
|---|---|
| Website / web app (Chrome, Firefox, Edge) | WOFF2 (COLRv1) |
| Safari / iOS web | WOFF2 (COLRv1) + CSS fallback for invisible glyphs |
| macOS design tools (Figma, Illustrator) | TTF — Safari & iOS (SBIX) |
| iOS native app (UIFont) | TTF — Safari & iOS (SBIX) |
| Cross-platform (best coverage) | Serve WOFF2, detect support, fallback to text symbols |

---

## 7. Safari & iOS — the full picture

### The problem

COLRv1 glyphs in the Private Use Area are invisible in Safari and all iOS browsers. There are two issues:
1. WebKit does not render COLRv1 colour fonts.
2. PUA codepoints have no OS fallback glyph — unlike standard Unicode characters, there is nothing to fall back to. The glyph simply disappears.

`CSS.supports('font-palette', 'normal')` returns `true` in Safari 15.4+ because the property is *parsed*, but the glyphs still don't render. **Do not use this for detection.**

### Correct detection

```typescript
export function detectColrSupport(): boolean {
  if (typeof window === "undefined") return true; // SSR: assume supported

  const ua = navigator.userAgent;

  // iOS always uses WebKit regardless of which browser the user chose
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // macOS Safari — Chrome, Edge, Firefox all include "Safari" in their UA
  // so we have to exclude them explicitly
  const isSafari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|EdgA|OPR/.test(ua);

  if (isIOS || isSafari) return false;

  return typeof CSS !== "undefined" && CSS.supports("font-palette", "normal");
}
```

### Fallback strategy for web

**Option 1 — Text symbol fallback** (Hue Type's approach):

Map each PUA glyph to a plain Unicode fallback character:

```tsx
const FALLBACK: Record<string, string> = {
  "download": "↓",
  "upload":   "↑",
  "add":      "+",
  "close":    "✕",
  "edit":     "✏",
  "swap":     "⇄",
  // etc.
};

function Icon({ glyph, size = 16 }) {
  const colrSupported = useColrSupport();
  if (!colrSupported) {
    return <span style={{ fontSize: size }}>{FALLBACK[glyph] ?? glyph}</span>;
  }
  return (
    <span style={{ fontFamily: "MyIcons", fontPalette: "--brand", fontSize: size }}>
      {CHAR_MAP[glyph]}
    </span>
  );
}
```

**Option 2 — SVG fallback** (most visual fidelity):

Serve SVG files as `<img>` or inline `<svg>` in Safari:

```tsx
function Icon({ glyph, size = 16 }) {
  const colrSupported = useColrSupport();
  if (!colrSupported) {
    return <img src={`/icons/${glyph}.svg`} width={size} height={size} alt="" />;
  }
  return <span style={{ fontFamily: "MyIcons", fontSize: size }}>{CHAR_MAP[glyph]}</span>;
}
```

**Option 3 — SBIX via CSS `@font-face` (future)**:

Safari renders SBIX in installed fonts (via CoreText), but serving SBIX over the web in a `@font-face` doesn't currently trigger SBIX rendering in WebKit's web font pipeline. This may change. For now, SBIX is for installed/bundled fonts only.

### When will Safari support COLRv1?

There is no confirmed timeline as of May 2026. The WebKit bug tracker ([Bug 242154](https://bugs.webkit.org/show_bug.cgi?id=242154)) has been open since 2022. Apple has not announced a target release for COLRv1 `font-palette` support.

**Recommendation:** Design with the text-symbol fallback so your UI is functional on Safari today. The COLRv1 experience will automatically activate for Safari users the day Apple ships support — no code change needed.

---

## 8. Safari fallback — the production pattern

The exact implementation Hue Type ships today. Use this verbatim if you want pixel-identical icon rendering on Chrome/FF/Edge (COLRv1 + CSS palettes) AND on Safari/iOS (SBIX bitmaps).

### Architecture in 6 steps

1. Ship two font files: `icons.woff2` (COLRv1) and `icons-safari.ttf` (COLRv1 + SBIX)
2. Declare `@font-face` for the COLR file under family `"MyIcons"`
3. On every page mount, run UA detection
4. If Safari/iOS: load the SBIX file under a **separate** family name `"MyIconsSafari"` via the `FontFace` API
5. Toggle a class on `<html>` (e.g. `.no-colr`)
6. Two CSS rules under that class do all the work: one swaps the `font-family` for icon elements, the other substitutes the palette crossfade with a filter transition

### Why a separate family name (not "MyIcons" for both)

If you load SBIX under the same family as the COLR face, the browser sees two faces registered for `"MyIcons"`. WebKit's matching algorithm picks the CSS-declared face (first-declared wins), tries to render PUA glyphs from it, and produces nothing — invisible icons. The symptom users describe is *"icons flash on briefly, then vanish after a second"* — that's the SBIX rendering before the COLR face finishes loading.

Using `"MyIcons"` for COLR and `"MyIconsSafari"` for SBIX eliminates the conflict. A CSS cascade rule under `.no-colr` flips every icon's `font-family` to the SBIX one with `!important`, overriding any inline style.

### Detection — the right way

`CSS.supports('font-palette', 'normal')` returns `true` in Safari 15.4+ even though COLRv1 still renders nothing. UA-sniff instead:

```typescript
export function detectColrSupport(): boolean {
  if (typeof window === "undefined") return true; // SSR: assume supported

  const ua = navigator.userAgent;

  // iOS always uses WebKit regardless of which browser the user chose
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // macOS Safari — Chrome/Firefox/Edge all include "Safari" in their UA,
  // so we have to exclude them explicitly
  const isSafari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|EdgA|OPR/.test(ua);

  if (isIOS || isSafari) return false;
  return CSS.supports("font-palette", "normal");
}
```

### Loading the SBIX font + flipping the class

```typescript
let loadStarted = false;

export async function ensureSbixFontLoaded(): Promise<void> {
  if (typeof window === "undefined" || loadStarted) return;
  loadStarted = true;

  try {
    const face = new FontFace(
      "MyIconsSafari",
      "url(/fonts/icons-safari.ttf)",
      { display: "block" },
    );
    const loaded = await face.load();
    document.fonts.add(loaded);

    // Tag <html> so the CSS cascade override kicks in
    document.documentElement.classList.add("no-colr");
  } catch {
    // Font failed to load — UI must still be usable via aria-label /
    // sibling text on every icon button
  }
}
```

### Mount it once at the root

```tsx
// app/layout.tsx (Next.js)
import { useEffect } from "react";

function SafariFontInit() {
  useEffect(() => {
    if (!detectColrSupport()) ensureSbixFontLoaded();
  }, []);
  return null;
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SafariFontInit />
        {children}
      </body>
    </html>
  );
}
```

### The two CSS rules under `.no-colr`

```css
/* 1. Family swap — every glyph element switches to the SBIX face.
      !important overrides inline style="font-family: MyIcons" */
.no-colr .icon-glyph {
  font-family: "MyIconsSafari" !important;
}

/* 2. Hover crossfade substitute — SBIX is fixed-colour, so the
      opacity-crossfade between two named palettes is invisible. A
      saturate / brightness filter gives equivalent visual feedback. */
.no-colr .icon-stack {
  transition: filter 300ms ease-in-out,
              opacity 300ms ease-in-out,
              transform 300ms ease-in-out;
  filter: saturate(0.2) brightness(0.92);
  opacity: 0.9;
}
.no-colr *:hover > .icon-stack,
.no-colr *:hover .icon-stack,
.no-colr .icon-stack:hover {
  filter: none;
  opacity: 1;
  transform: scale(1.06);
}
```

Add `className="icon-glyph"` to every icon span. Wrap any hover-crossfade icon pair in `<span class="icon-stack">...</span>`. That's the entire integration — Chrome users get the real COLR palette crossfade, Safari users get the filter-based equivalent, neither needs any other code path.

### Limitations on Safari

- `font-palette` overrides have **no visual effect** on SBIX (it's fixed-colour). Glyphs render with the colours baked into the SBIX bitmaps.
- The COLR "grey → brand" hover crossfade can't happen on Safari. The filter-based substitute above is the workaround.
- The SBIX file must include **every glyph** you reference. If you add a new icon to your COLR font, rebuild the SBIX file too — Safari will render an empty box at any codepoint missing from the SBIX strikes.

---

## 9. React / Next.js Integration

### Loading the font in Next.js

Place your WOFF2 in `public/fonts/` and add a `@font-face` in `app/globals.css`:

```css
@font-face {
  font-family: "MyIcons";
  src: url("/fonts/yourfont.woff2") format("woff2");
  font-display: block;
}
```

For preloading (eliminates FOIT on first render):

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <link
          rel="preload"
          href="/fonts/yourfont.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Checking font load status in JS

`document.fonts.check()` is unreliable for PUA codepoints. Use `document.fonts.forEach()` instead:

```tsx
// Check if font is loaded
let loaded = false;
document.fonts.forEach((f) => {
  if (f.family === "MyIcons" && f.status === "loaded") loaded = true;
});

// Or wait for it
await document.fonts.load("16px MyIcons");
```

### Dynamic font loading from a signed URL

```tsx
async function loadFontFromUrl(url: string, family: string) {
  // Check if already loaded
  let exists = false;
  document.fonts.forEach((f) => {
    if (f.family === family && f.status === "loaded") exists = true;
  });
  if (exists) return;

  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const face = new FontFace(family, buf);
  await face.load();
  document.fonts.add(face);
}
```

### Complete React hook

```tsx
// useIconFont.ts
import { useEffect, useState } from "react";

export function useIconFont(fontUrl: string | null, fontFamily: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!fontUrl) return;

    let cancelled = false;
    (async () => {
      try {
        // Check if already in document.fonts
        let exists = false;
        document.fonts.forEach((f) => {
          if (f.family === fontFamily && f.status === "loaded") exists = true;
        });
        if (exists) { setLoaded(true); return; }

        const res = await fetch(fontUrl);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const face = new FontFace(fontFamily, buf);
        await face.load();
        if (cancelled) return;
        document.fonts.add(face);
        setLoaded(true);
      } catch {
        // Font failed to load — UI should fall back gracefully
      }
    })();
    return () => { cancelled = true; };
  }, [fontUrl, fontFamily]);

  return loaded;
}
```

---

## 10. File Size & Performance

Real measured numbers from Hue Type's own `hue-type.ttf` (12 COLRv1 glyphs):

| Format | File size | HTTP requests | CSS recolour |
|---|---|---|---|
| 12 × SVG files | ~48 KB | 12 | Partial (fill only) |
| 12 × PNG @2x | ~120 KB | 12 | ✗ |
| 1 × WOFF2 (COLRv1) | **~4 KB** | **1** | ✓ `font-palette` |
| 1 × TTF + SBIX (Safari) | ~40 KB | 1 | ✗ (bitmaps) |

The COLRv1 WOFF2 is **15× smaller than SVGs** and **30× smaller than PNGs** — and it's a single cached HTTP request.

**Cache strategy:** Fonts are cached indefinitely by default. Set `Cache-Control: public, max-age=31536000, immutable` on your font URL. The URL should include a content hash or version segment so you can invalidate on updates.

**Signed URL caching note:** Hue Type serves fonts via signed URLs that expire. For production, proxy your font through your own domain and CDN to get long-lived caching. The download URL is only meant for the initial download, not for serving directly to users.

---

## 11. Format Comparison Table

| Feature | SVG files | PNG sprites | COLRv1 font | SBIX font |
|---|---|---|---|---|
| Scalable | ✓ | ✗ | ✓ | Strikes only |
| Multi-colour | ✓ | ✓ | ✓ | ✓ |
| CSS recolour | Partial | ✗ | ✓ `font-palette` | ✗ |
| Single request | ✗ | Sprite only | ✓ | ✓ |
| Long-lived cacheable | Per file | ✓ | ✓ | ✓ |
| Inline in HTML | ✓ (bloated) | ✗ | ✓ 1 char | ✓ 1 char |
| CSS animations | JS/CSS | ✗ | ✓ opacity crossfade | ✗ |
| `font-palette` palette swap | ✗ | ✗ | ✓ | ✗ |
| Safari / iOS | ✓ | ✓ | ✗ | ✓ |
| Chrome / Firefox / Edge | ✓ | ✓ | ✓ | Partial |
| Design tools (macOS) | ✓ | ✓ | ✗ (no SBIX) | ✓ |
| File size (12 icons) | ~48 KB | ~120 KB | **~4 KB** | ~40 KB |

---

## 12. FAQ

**Q: Can I use `font-palette` to make icons completely monochrome?**  
A: Yes. Override all colour slots with the same value:
```css
@font-palette-values --mono { font-family: "MyIcons"; override-colors: 0 #333, 1 #333, 2 #333; }
```

**Q: Does `font-palette` animate with CSS transitions?**  
A: Not directly — you can't write `transition: font-palette 300ms`. Use the two-stacked-icons opacity crossfade pattern described above.

**Q: Can I use these icons in an `<img>` tag?**  
A: No. `<img>` cannot use web fonts. Use `<span>` or another inline element.

**Q: Will my icons render in email clients?**  
A: No. Email clients strip `@font-face` and custom fonts. For emails, export individual PNGs and use `<img>` tags.

**Q: Can I host the font on a CDN?**  
A: Yes. Download the WOFF2 from Hue Type, upload it to your CDN, and update your `@font-face` src URL. Add CORS headers (`Access-Control-Allow-Origin: *`) on your CDN — fonts require CORS for cross-origin use.

**Q: Why are my icons invisible in Safari?**  
A: Safari does not render COLRv1 fonts. PUA codepoints have no fallback glyph, so they show nothing. Implement the detection + fallback pattern in section 6.

**Q: Can I use `font-palette` with variable fonts?**  
A: `font-palette` works with any COLR font regardless of whether it's also a variable font. Hue Type outputs standard (non-variable) COLR fonts.

**Q: How many colour slots does Hue Type use?**  
A: 3 colour slots (indexed 0, 1, 2) per glyph. Your `@font-palette-values` overrides should specify all three.

**Q: What codepoints are the glyphs at?**  
A: U+E001 through U+E00C (Private Use Area). In JavaScript: `String.fromCodePoint(0xe001)` through `String.fromCodePoint(0xe00c)`.

**Q: Can I subset the font to fewer glyphs?**  
A: Hue Type builds the font from exactly the glyphs you upload — there's no extra subsetting step needed.

**Q: Is `@font-palette-values` scoped to a document or global?**  
A: It's scoped to the stylesheet it's declared in. In a Shadow DOM component, declare `@font-palette-values` inside the component's shadow stylesheet.

---

*Last updated: May 2026 · Hue Type*
