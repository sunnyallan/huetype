"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HueIcon, HUE, HUE_ALL, type HueGlyph, type HuePalette } from "@/components/hue-icon";
import { Logo } from "@/components/logo";
import Loader from "@/components/loader";

/* ── Data ──────────────────────────────────────────────────────────────── */

const HERO_GLYPHS: HueGlyph[] = [
  "illustration", "triTone", "upload", "duoTone", "download", "newType",
];

// Named palettes from globals.css — cycle on the hero glyph strip
const HERO_PALETTES: HuePalette[] = ["brand", "ref", "close-hover", "edit-hover"];

// Repeating glyph string for the text-on-path background (all 12 glyphs × 4)
const GLYPH_PATH_TEXT = (HUE_ALL.join("  ") + "  ·  ").repeat(4);

// File size bar chart
const BAR_DATA = [
  { label: "12 × SVG files", size: "~48 KB", pct: 40, lime: false },
  { label: "12 × PNG @2x",   size: "~120 KB", pct: 100, lime: false },
  { label: "1 × WOFF2 font", size: "~4 KB",   pct: 3.3, lime: true  },
];

// Feature comparison table  [feature, svg, png, font]
const TABLE_ROWS: [string, boolean | string, boolean | string, boolean | string][] = [
  ["Scalable",          true,           false,         true            ],
  ["Multi-colour",      true,           true,          true            ],
  ["CSS recolour",      "Partial",      false,         "✓ font-palette"],
  ["Single request",    false,          "Sprite only", true            ],
  ["Cacheable",         "Per file",     true,          true            ],
  ["Inline in HTML",    "✓ (verbose)",  false,         "✓ 1 char"      ],
  ["Animations",        "JS / CSS",     false,         "CSS only"      ],
  ["12 icons — size",   "~48 KB",       "~120 KB",     "~4 KB"         ],
];

type InlineTab = "headings" | "buttons" | "body";

/* ── Main component ─────────────────────────────────────────────────────── */

export default function LandingClient() {
  const [heroPaletteIdx, setHeroPaletteIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<InlineTab>("headings");
  const barSectionRef = useRef<HTMLElement>(null);
  const [barVisible, setBarVisible] = useState(false);

  // Cycle hero glyph strip through palettes
  useEffect(() => {
    const id = setInterval(
      () => setHeroPaletteIdx((i) => (i + 1) % HERO_PALETTES.length),
      900,
    );
    return () => clearInterval(id);
  }, []);

  // Animate bar chart on scroll into view
  useEffect(() => {
    const el = barSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setBarVisible(true); },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const heroPalette = HERO_PALETTES[heroPaletteIdx];

  return (
    <main className="ht-app min-h-screen overflow-x-hidden">

      {/* ── 1. Navbar ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-ht-white shadow-ht-soft border-b border-ht-surface">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
          <Logo size={36} />
          <div className="flex items-center gap-4">
            <a
              href="/docs.html"
              className="text-sm text-ht-ink/60 hover:text-ht-ink transition-colors duration-200 ease-in-out"
            >
              Docs
            </a>
            <Link
              href="/login"
              className="text-sm text-ht-ink/60 hover:text-ht-ink transition-colors duration-200 ease-in-out"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="ht-btn bg-ht-ink text-ht-white px-5 py-2.5 text-sm rounded-ht-md hover:opacity-90 transition-opacity duration-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 2. Hero ────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[88vh] px-6 overflow-hidden">

        {/* Decorative glyph-on-path background — actual HueType icons scrolling along arcs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <svg
            viewBox="0 0 1200 200"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
            style={{ opacity: 0.09 }}
          >
            <defs>
              <path id="arc1" d="M -200,100 Q 300,30  700,100 Q 1100,170 1400,100" />
              <path id="arc2" d="M -200,70  Q 300,140 700,70  Q 1100,0   1400,70" />
            </defs>
            {/* Top arc — glyphs in ref (grey) palette */}
            <text
              className="ht-glyph"
              fontFamily="HueType"
              fontSize="24"
              style={{ fontPalette: "--ht-ref" } as React.CSSProperties}
            >
              <textPath href="#arc1">
                <animate
                  attributeName="startOffset"
                  from="-80%"
                  to="100%"
                  dur="26s"
                  repeatCount="indefinite"
                />
                {GLYPH_PATH_TEXT}
              </textPath>
            </text>
            {/* Bottom arc — glyphs in duo (mono grey) palette, offset start */}
            <text
              className="ht-glyph"
              fontFamily="HueType"
              fontSize="20"
              style={{ fontPalette: "--ht-duo" } as React.CSSProperties}
            >
              <textPath href="#arc2">
                <animate
                  attributeName="startOffset"
                  from="-40%"
                  to="140%"
                  dur="34s"
                  repeatCount="indefinite"
                />
                {GLYPH_PATH_TEXT}
              </textPath>
            </text>
          </svg>
        </div>

        {/* Foreground */}
        <div className="relative text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ht-white border border-ht-surface text-xs text-ht-ink/60 mb-8 shadow-ht-soft">
            <HueIcon glyph="illustration" size={13} palette="brand" />
            Multi-colour icon font builder · COLR/CPAL v1
          </div>

          <h1
            className="font-semibold leading-[1.05] tracking-tight text-ht-ink mb-6"
            style={{ fontSize: "clamp(48px, 8vw, 88px)" }}
          >
            One font.
            <br />
            All your icons.
          </h1>

          <p className="text-lg text-ht-ink/60 max-w-xl mx-auto mb-10 leading-relaxed">
            Upload SVGs → get a WOFF2 colour font you can style with CSS.
            One character per icon. Zero JavaScript.
          </p>

          <div className="flex items-center justify-center gap-3 mb-16 flex-wrap">
            <Link href="/login" className="ht-btn bg-ht-ink text-ht-white px-8 py-4 rounded-ht-md hover:opacity-90 transition-opacity duration-200 font-medium inline-flex items-center gap-2">
              Start building for free
              <HueIcon glyph="goArrow" size={16} palette="light-lime" />
            </Link>
            <a href="#loader-demo" className="ht-btn-pill">
              See how it works ↓
            </a>
          </div>

          {/* Glyph strip — cycles through palettes */}
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {HERO_GLYPHS.map((glyph) => (
              <HueIcon
                key={glyph}
                glyph={glyph}
                size={38}
                palette={heroPalette}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Loader / Animation Demo ─────────────────────────────────── */}
      <section id="loader-demo" className="py-24 px-6 bg-ht-white scroll-mt-16">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-ht-ink/40 mb-3 text-center">
            CSS animations, zero JS
          </p>
          <h2 className="text-4xl font-semibold text-center text-ht-ink mb-4">
            Animated loaders out of the box
          </h2>
          <p className="text-ht-ink/60 text-center max-w-xl mx-auto mb-16 leading-relaxed">
            Every animation in this app runs on{" "}
            <code className="px-1.5 py-0.5 rounded bg-ht-surface text-xs font-mono">
              font-palette
            </code>{" "}
            — no canvas, no SVG redraws, no runtime JS in your bundle.
          </p>

          {/* Three size variants */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {(["sm", "md", "lg"] as const).map((s, i) => (
              <div key={s} className="ht-card flex flex-col items-center gap-6 py-12">
                <Loader size={s} longWaitMs={9999999} />
                <div className="text-center">
                  <p className="text-xs font-medium text-ht-ink/40 uppercase tracking-widest">
                    {["Small", "Medium", "Large"][i]}
                  </p>
                  <p className="text-sm text-ht-ink font-mono mt-1">
                    {[20, 36, 56][i]}px glyphs
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Code snippet */}
          <div className="rounded-ht-xl bg-ht-ink overflow-hidden">
            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-white/10">
              <span className="w-3 h-3 rounded-full bg-white/20" />
              <span className="w-3 h-3 rounded-full bg-white/20" />
              <span className="w-3 h-3 rounded-full bg-white/20" />
              <span className="ml-3 text-xs text-white/40 font-mono">styles.css</span>
            </div>
            <pre className="p-6 text-sm font-mono text-white/80 leading-relaxed overflow-x-auto">{`/* Inject a named palette and swap it dynamically */
@font-palette-values --my-palette {
  font-family: HueType;
  override-colors: 0 #7c6af5, 1 #eefa94, 2 #ff6b9d;
}

.icon {
  font-family: HueType;
  font-palette: --my-palette;
}

/* Palette crossfade — stack two icons, crossfade opacity */
.icon-rest   { opacity: 1; transition: opacity 300ms ease-in-out; }
.icon-hover  { opacity: 0; transition: opacity 300ms ease-in-out; }
button:hover .icon-rest  { opacity: 0; }
button:hover .icon-hover { opacity: 1; }`}</pre>
          </div>
        </div>
      </section>

      {/* ── 4. Hover Effects Showcase ──────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-ht-ink/40 mb-3 text-center">
            Interactive
          </p>
          <h2 className="text-4xl font-semibold text-center text-ht-ink mb-4">
            Palette crossfades — hover to see
          </h2>
          <p className="text-ht-ink/60 text-center max-w-xl mx-auto mb-16 leading-relaxed">
            CSS can&apos;t interpolate between two palette names directly — so we
            stack two icons and crossfade their opacity. 300ms. No JS required
            at render time.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <HoverShowcaseCard
              glyph="close"
              label="Close"
              restPalette="icon"
              hoverPalette="close-hover"
              note="--ht-icon → --ht-close-hover"
            />
            <HoverShowcaseCard
              glyph="edit"
              label="Edit"
              restPalette="icon"
              hoverPalette="edit-hover"
              note="--ht-icon → --ht-edit-hover"
            />
            <HoverShowcaseCard
              glyph="add"
              label="Add"
              restPalette="ref"
              hoverPalette="brand"
              note="--ht-ref → --ht-brand"
            />
            <HoverShowcaseCard
              glyph="download"
              label="Download"
              restPalette="ref"
              hoverPalette="brand"
              note="--ht-ref → --ht-brand"
            />
            <HoverShowcaseCard
              glyph="upload"
              label="Upload"
              restPalette="duo"
              hoverPalette="brand"
              note="--ht-duo → --ht-brand"
            />
            <HoverShowcaseCard
              glyph="goArrow"
              label="Go"
              restPalette="arrow"
              hoverPalette="brand"
              note="--ht-arrow → --ht-brand"
            />
          </div>
        </div>
      </section>

      {/* ── 5. Size Comparison ─────────────────────────────────────────── */}
      <section
        className="py-24 px-6 bg-ht-white"
        ref={barSectionRef}
      >
        <div className="max-w-[1200px] mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-ht-ink/40 mb-3 text-center">
            File size
          </p>
          <h2 className="text-4xl font-semibold text-center text-ht-ink mb-4">
            12 icons. One file. 30× smaller.
          </h2>
          <p className="text-ht-ink/60 text-center max-w-xl mx-auto mb-16 leading-relaxed">
            A COLR colour font packs everything into a single cached file —
            no sprite sheets, no SVG-in-JS bundle bloat.
          </p>

          <div className="max-w-2xl mx-auto space-y-7 mb-12">
            {BAR_DATA.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ht-ink">{row.label}</span>
                  <span
                    className={`text-sm font-mono ${row.lime ? "text-ht-ink font-semibold" : "text-ht-ink/50"}`}
                  >
                    {row.size}
                  </span>
                </div>
                <div className="h-3 bg-ht-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-[1200ms] ease-out ${
                      row.lime ? "bg-ht-lime" : "bg-ht-ink/20"
                    }`}
                    style={{ width: barVisible ? `${row.pct}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="ht-card max-w-2xl mx-auto text-center py-8">
            <p className="text-xl font-semibold text-ht-ink mb-2">
              15× smaller than SVGs · 30× smaller than PNGs
            </p>
            <p className="text-sm text-ht-ink/60 leading-relaxed">
              <code className="font-mono">hue-type.ttf</code> is 4,008 bytes for 12 COLR/CPAL v1 glyphs.
              One HTTP request. One cache entry. Every icon.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Inline Usage / Custom Emoji ─────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-ht-ink/40 mb-3 text-center">
            Inline usage
          </p>
          <h2 className="text-4xl font-semibold text-center text-ht-ink mb-4">
            Use them like emoji — right in your text
          </h2>
          <p className="text-ht-ink/60 text-center max-w-xl mx-auto mb-10 leading-relaxed">
            Fonts live in the text flow. Drop a glyph anywhere you&apos;d type a
            character — headings, buttons, body copy — no img tag, no SVG block.
          </p>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {(["headings", "buttons", "body"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-ht-md text-sm font-medium transition-colors duration-200 ease-in-out ${
                  activeTab === tab
                    ? "bg-ht-ink text-ht-white"
                    : "bg-ht-white text-ht-ink/60 hover:text-ht-ink border border-ht-surface"
                }`}
              >
                {tab === "headings"
                  ? "In headings"
                  : tab === "buttons"
                  ? "In buttons"
                  : "In body text"}
              </button>
            ))}
          </div>

          {/* Tab panel */}
          <div className="ht-card min-h-[200px] flex items-center justify-center p-10 md:p-16">
            {activeTab === "headings" && (
              <h3 className="text-3xl md:text-4xl font-semibold text-ht-ink leading-snug text-center">
                Design{" "}
                <HueIcon glyph="illustration" size={34} palette="brand" className="align-middle" />
                {" "}systems that scale{" "}
                <HueIcon glyph="goArrow" size={34} palette="brand" className="align-middle" />
                {" "}and delight{" "}
                <HueIcon glyph="duoTone" size={34} palette="brand" className="align-middle" />
                {" "}users
              </h3>
            )}
            {activeTab === "buttons" && (
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <button className="ht-btn bg-ht-ink text-ht-white px-6 py-3 rounded-ht-md font-medium inline-flex items-center gap-2">
                  <HueIcon glyph="download" size={16} palette="light-lime" />
                  Download font
                </button>
                <button className="ht-btn-pill gap-2">
                  <HueIcon glyph="upload" size={16} palette="ref" />
                  Upload SVGs
                </button>
                <button className="ht-btn-pill gap-2">
                  <HueIcon glyph="add" size={16} palette="ref" />
                  New project
                </button>
              </div>
            )}
            {activeTab === "body" && (
              <p className="text-lg text-ht-ink leading-loose max-w-lg text-center">
                Build your icon system{" "}
                <HueIcon glyph="illustration" size={18} palette="brand" className="align-middle" />
                {" "}once. Deploy it{" "}
                <HueIcon glyph="goArrow" size={18} palette="brand" className="align-middle" />
                {" "}everywhere — web, desktop, mobile, Figma{" "}
                <HueIcon glyph="newType" size={18} palette="brand" className="align-middle" />
                {" "}— from a single 4&nbsp;KB file.
              </p>
            )}
          </div>

          {/* Proof point */}
          <div className="mt-6 rounded-ht-xl bg-ht-ink px-6 py-5">
            <p className="text-sm leading-relaxed text-white/70">
              <span className="text-white font-medium">
                The same format that powers Google Noto Color Emoji.
              </span>{" "}
              COLRv1 ships on every Android device and Chrome install. Apple&apos;s
              emoji system is an SBIX font. Now you can build the same for your brand.
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. SVG vs PNG vs Font table ────────────────────────────────── */}
      <section className="py-24 px-6 bg-ht-white">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-ht-ink/40 mb-3 text-center">
            Comparison
          </p>
          <h2 className="text-4xl font-semibold text-center text-ht-ink mb-4">
            Why a font wins
          </h2>
          <p className="text-ht-ink/60 text-center max-w-xl mx-auto mb-16 leading-relaxed">
            A COLR colour font combines the scalability of SVG, the richness of
            PNG, and adds CSS-programmable palettes — in a fraction of the size.
          </p>

          <div className="overflow-x-auto rounded-ht-xl border border-ht-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ht-surface">
                  <th className="text-left py-4 px-5 text-ht-ink/50 font-medium w-[32%]">
                    Feature
                  </th>
                  <th className="py-4 px-5 text-ht-ink/50 font-medium text-center">
                    SVG files
                  </th>
                  <th className="py-4 px-5 text-ht-ink/50 font-medium text-center">
                    PNG sprites
                  </th>
                  <th className="py-4 px-5 font-semibold text-center bg-ht-lime text-ht-ink">
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <HueIcon glyph="newType" size={14} palette="ink" />
                      Colour font
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map(([feature, svg, png, font], rowIdx) => (
                  <tr
                    key={feature}
                    className={`border-b border-ht-surface hover:bg-ht-surface/60 transition-colors duration-150 ${
                      rowIdx % 2 !== 0 ? "bg-ht-surface/20" : ""
                    }`}
                  >
                    <td className="py-3.5 px-5 text-ht-ink font-medium">{feature}</td>
                    <td className="py-3.5 px-5 text-center text-ht-ink/60">
                      {renderCell(svg)}
                    </td>
                    <td className="py-3.5 px-5 text-center text-ht-ink/60">
                      {renderCell(png)}
                    </td>
                    <td className="py-3.5 px-5 text-center font-semibold text-ht-ink bg-ht-lime/20">
                      {renderCell(font)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center text-xs text-ht-ink/40">
            COLR/CPAL v1 · Chrome 98+ · Firefox 108+ · Edge 98+ · ~72% global
            coverage. Safari support coming.
          </p>
        </div>
      </section>

      {/* ── 8. Final CTA ───────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <div className="flex items-center justify-center mb-10">
            <Loader size="lg" longWaitMs={9999999} />
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold text-ht-ink mb-5">
            Build your first colour font
            <br />
            in 60 seconds
          </h2>
          <p className="text-ht-ink/60 text-lg mb-10">
            Free. No credit card. Export WOFF2 + TTF.
          </p>
          <Link
            href="/login"
            className="ht-btn bg-ht-ink text-ht-white px-10 py-5 rounded-ht-md hover:opacity-90 transition-opacity duration-200 font-medium inline-flex items-center gap-2"
          >
            Start building →
          </Link>
        </div>
      </section>

      {/* ── 9. Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-ht-surface bg-ht-white py-8 px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs text-ht-ink/40">
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <span>© 2026 Hue Type</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/docs.html"
              className="hover:text-ht-ink transition-colors duration-200 ease-in-out"
            >
              Docs
            </a>
            <Link
              href="/login"
              className="hover:text-ht-ink transition-colors duration-200 ease-in-out"
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── Helper components ─────────────────────────────────────────────────── */

function HoverShowcaseCard({
  glyph,
  label,
  restPalette,
  hoverPalette,
  note,
}: {
  glyph: HueGlyph | string;
  label: string;
  restPalette: HuePalette;
  hoverPalette: HuePalette;
  note: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="ht-card flex flex-col items-center gap-5 py-10 border border-transparent hover:border-ht-line transition-colors duration-200 ease-in-out cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="ht-icon-stack"
        style={{
          position: "relative",
          display: "inline-flex",
          width: 44,
          height: 44,
        }}
      >
        <HueIcon
          glyph={glyph}
          size={44}
          palette={restPalette}
          style={{
            position: "absolute",
            inset: 0,
            transition: "opacity 300ms ease-in-out",
            opacity: hovered ? 0 : 1,
          }}
        />
        <HueIcon
          glyph={glyph}
          size={44}
          palette={hoverPalette}
          style={{
            position: "absolute",
            inset: 0,
            transition: "opacity 300ms ease-in-out",
            opacity: hovered ? 1 : 0,
          }}
        />
      </span>
      <div className="text-center">
        <p className="text-sm font-medium text-ht-ink">{label}</p>
        <p className="text-[11px] text-ht-ink/40 font-mono mt-1">{note}</p>
      </div>
    </div>
  );
}

function renderCell(v: boolean | string): React.ReactNode {
  if (v === true)  return <span className="text-green-600 font-medium">✓</span>;
  if (v === false) return <span className="text-ht-ink/25">✗</span>;
  return <span>{v}</span>;
}
