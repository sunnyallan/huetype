"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Palette, Download, Globe, Layers, Zap } from "lucide-react";

// Real palette extracted from the demo font (in the order the font has them)
const ORIGINAL_PALETTE: [number, number, number][] = [
  [30, 132, 73], [39, 174, 96], [169, 223, 191],
  [192, 57, 43], [230, 126, 34], [231, 76, 60],
  [241, 148, 138], [243, 156, 18], [253, 235, 208],
  [255, 107, 53], [255, 217, 61], [255, 245, 183],
];

// Cycle palettes for the hero animation
const PALETTE_PRESETS: [number, number, number][][] = [
  ORIGINAL_PALETTE,
  // Pastel
  [
    [255, 179, 186], [255, 223, 186], [255, 255, 186],
    [186, 255, 201], [186, 225, 255], [201, 178, 255],
    [255, 179, 186], [255, 223, 186], [255, 255, 186],
    [186, 255, 201], [186, 225, 255], [201, 178, 255],
  ],
  // Cyber
  [
    [0, 255, 200], [124, 106, 245], [255, 0, 200],
    [50, 50, 80], [0, 200, 255], [255, 100, 200],
    [200, 200, 255], [255, 200, 50], [255, 240, 200],
    [255, 50, 100], [200, 255, 50], [255, 255, 200],
  ],
  // Mono purple
  [
    [60, 40, 100], [124, 106, 245], [200, 190, 255],
    [50, 30, 80], [100, 80, 180], [124, 106, 245],
    [200, 190, 255], [140, 120, 220], [220, 210, 255],
    [80, 60, 140], [180, 160, 240], [230, 220, 255],
  ],
];

const GLYPHS = [
  { char: "", name: "Sun" },
  { char: "", name: "Heart" },
  { char: "", name: "Star" },
  { char: "", name: "Leaf" },
];

function paletteToCss(palette: [number, number, number][]) {
  return palette
    .map((c, i) => `${i} rgb(${c[0]},${c[1]},${c[2]})`)
    .join(",\n        ");
}

export default function LandingClient() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [customPalette, setCustomPalette] = useState(ORIGINAL_PALETTE);
  const [size, setSize] = useState(140);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Cycle palette presets in hero
  useEffect(() => {
    const id = setInterval(() => {
      setPresetIdx((i) => (i + 1) % PALETTE_PRESETS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Inject the @font-face once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @font-face {
        font-family: "HueTypeDemo";
        src: url("/huetype-demo.ttf") format("truetype");
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Inject the dynamic palette overrides
  useEffect(() => {
    if (!styleRef.current) {
      const el = document.createElement("style");
      document.head.appendChild(el);
      styleRef.current = el;
    }
    styleRef.current.textContent = `
      @font-palette-values --hero-palette {
        font-family: "HueTypeDemo";
        override-colors: ${paletteToCss(PALETTE_PRESETS[presetIdx])};
      }
      @font-palette-values --custom-palette {
        font-family: "HueTypeDemo";
        override-colors: ${paletteToCss(customPalette)};
      }
      .ht-glyph-hero {
        font-family: "HueTypeDemo";
        font-palette: --hero-palette;
        transition: font-palette 1s ease;
      }
      .ht-glyph-custom {
        font-family: "HueTypeDemo";
        font-palette: --custom-palette;
      }
    `;
  }, [presetIdx, customPalette]);

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-bg/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="font-semibold text-sm">Hue Type</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Sign in
            </Link>
            <Link href="/login" className="btn-primary text-sm">
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-text-secondary mb-6">
            <Sparkles size={12} className="text-accent" />
            Multi-colour icon font builder
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold leading-tight tracking-tight mb-6">
            Your icons,
            <br />
            <span className="bg-gradient-to-r from-accent via-pink-400 to-orange-400 bg-clip-text text-transparent">
              shipped as a font
            </span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
            Drop in your SVGs. Build a real OpenType colour font with COLR/CPAL
            v1. Use it anywhere — websites, apps, design tools — with a single
            character.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login" className="btn-primary">
              Start building <ArrowRight size={14} />
            </Link>
            <a href="#playground" className="btn-secondary">
              Try the playground
            </a>
          </div>
        </div>

        {/* Animated hero glyphs */}
        <div className="card p-12 flex flex-wrap gap-8 justify-center items-center">
          {GLYPHS.map((g) => (
            <span
              key={g.char}
              className="ht-glyph-hero block"
              style={{ fontSize: "180px", lineHeight: 1 }}
            >
              {g.char}
            </span>
          ))}
        </div>
        <p className="text-center text-xs text-text-muted mt-4">
          ↑ Same TTF file. Palettes cycle every 3 seconds via CSS
          <code className="mx-1 px-1.5 py-0.5 rounded bg-bg-card border border-border font-mono text-[10px]">
            font-palette
          </code>
        </p>
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <h2 className="text-sm uppercase tracking-wider text-text-secondary mb-3 text-center">
          Why a colour font
        </h2>
        <p className="text-3xl md:text-4xl font-semibold text-center mb-16 max-w-3xl mx-auto">
          One file. Every shape, in colour, at any size.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Layers size={20} />}
            title="True multi-colour"
            body="Each glyph keeps its own layered colours. No CSS hacks, no SVG hacks — real OpenType."
          />
          <FeatureCard
            icon={<Palette size={20} />}
            title="Recolour live"
            body="Change palettes at runtime with one line of CSS. Themed UIs, dark mode, brand variants — all from one font."
          />
          <FeatureCard
            icon={<Globe size={20} />}
            title="Works everywhere"
            body="Renders in Chrome, Safari, Firefox, Figma. Falls back gracefully on older platforms."
          />
          <FeatureCard
            icon={<Zap size={20} />}
            title="Tiny payload"
            body="Hundreds of icons in a few KB. Faster than a sprite sheet, simpler than SVG-in-JS."
          />
          <FeatureCard
            icon={<Download size={20} />}
            title="WOFF2 + TTF"
            body="Both formats. Drop into your @font-face, install on your machine, or hand off to designers."
          />
          <FeatureCard
            icon={<Sparkles size={20} />}
            title="Built in seconds"
            body="Upload SVGs, click build. We run nanoemoji on the cloud and give you back a font."
          />
        </div>
      </section>

      {/* Playground */}
      <section
        id="playground"
        className="py-24 px-6 max-w-6xl mx-auto scroll-mt-20"
      >
        <h2 className="text-sm uppercase tracking-wider text-text-secondary mb-3 text-center">
          Live playground
        </h2>
        <p className="text-3xl md:text-4xl font-semibold text-center mb-3">
          Recolour the font, in real time
        </p>
        <p className="text-text-secondary text-center mb-12 max-w-2xl mx-auto">
          This is the actual TTF you&apos;d build with Hue Type. Edit any swatch
          to see CSS{" "}
          <code className="mx-1 px-1.5 py-0.5 rounded bg-bg-card border border-border font-mono text-xs">
            font-palette
          </code>{" "}
          rewrite the glyphs instantly.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Big preview */}
          <div className="lg:col-span-2 card p-12 flex items-center justify-center">
            <div className="flex flex-wrap gap-8 justify-center">
              {GLYPHS.map((g) => (
                <span
                  key={g.char}
                  className="ht-glyph-custom block"
                  style={{ fontSize: `${size}px`, lineHeight: 1 }}
                >
                  {g.char}
                </span>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="card p-4">
              <label className="text-xs uppercase tracking-wider text-text-secondary block mb-2">
                Size · {size}px
              </label>
              <input
                type="range"
                min="40"
                max="220"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs uppercase tracking-wider text-text-secondary">
                  Palette
                </label>
                <button
                  onClick={() => setCustomPalette(ORIGINAL_PALETTE)}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {customPalette.map((c, i) => (
                  <input
                    key={i}
                    type="color"
                    value={rgbToHex(c)}
                    onChange={(e) => {
                      const next = [...customPalette];
                      next[i] = hexToRgb(e.target.value);
                      setCustomPalette(next);
                    }}
                    className="w-full h-9 bg-transparent border-0 cursor-pointer rounded"
                  />
                ))}
              </div>
            </div>

            <div className="card p-4">
              <label className="text-xs uppercase tracking-wider text-text-secondary block mb-2">
                Quick presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "Original", palette: ORIGINAL_PALETTE },
                  { name: "Pastel", palette: PALETTE_PRESETS[1] },
                  { name: "Cyber", palette: PALETTE_PRESETS[2] },
                  { name: "Purple", palette: PALETTE_PRESETS[3] },
                ].map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setCustomPalette(p.palette)}
                    className="btn-secondary text-xs py-1.5"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <h2 className="text-sm uppercase tracking-wider text-text-secondary mb-3 text-center">
          Where it shines
        </h2>
        <p className="text-3xl md:text-4xl font-semibold text-center mb-16 max-w-3xl mx-auto">
          Designed for the way modern teams ship
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UseCaseCard
            title="Design systems"
            body="Ship one font instead of 200 SVG files. Each app pulls only what it renders — no JSON manifests, no build steps."
            visual={
              <div className="flex gap-4 justify-center items-center text-5xl ht-glyph-custom">
                <span>{""}</span>
                <span>{""}</span>
                <span>{""}</span>
                <span>{""}</span>
              </div>
            }
          />
          <UseCaseCard
            title="Themed UIs"
            body="Light mode, dark mode, brand A, brand B — same font, different palette. Switch in one CSS rule."
            visual={
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-4 text-4xl text-center ht-glyph-custom">
                  {""}
                </div>
                <div className="bg-black rounded-lg p-4 text-4xl text-center ht-glyph-custom">
                  {""}
                </div>
              </div>
            }
          />
          <UseCaseCard
            title="Decorative typography"
            body="Drop colour glyphs inline with text. Headlines that breathe, captions with a wink."
            visual={
              <p className="text-2xl leading-relaxed text-center">
                hello{" "}
                <span className="ht-glyph-custom text-3xl align-middle">
                  {""}
                </span>{" "}
                world{" "}
                <span className="ht-glyph-custom text-3xl align-middle">
                  {""}
                </span>
              </p>
            }
          />
          <UseCaseCard
            title="Cross-platform handoff"
            body="Designers install the font in Figma. Developers @font-face it. Same source, same look — across the org."
            visual={
              <div className="flex justify-center items-center gap-3 text-xs text-text-secondary">
                <code className="px-2 py-1 rounded bg-bg border border-border">
                  Figma
                </code>
                →
                <code className="px-2 py-1 rounded bg-bg border border-border">
                  CSS
                </code>
                →
                <code className="px-2 py-1 rounded bg-bg border border-border">
                  iOS
                </code>
                →
                <code className="px-2 py-1 rounded bg-bg border border-border">
                  Android
                </code>
              </div>
            }
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 max-w-4xl mx-auto text-center">
        <div className="flex justify-center gap-6 mb-8 flex-wrap">
          {GLYPHS.map((g) => (
            <span
              key={g.char}
              className="ht-glyph-hero"
              style={{ fontSize: "70px", lineHeight: 1 }}
            >
              {g.char}
            </span>
          ))}
        </div>
        <h2 className="text-4xl md:text-5xl font-semibold mb-6">
          Build your first font in 60 seconds.
        </h2>
        <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto">
          Free to start. Drag SVGs, hit build, get a colour font. That&apos;s it.
        </p>
        <Link href="/login" className="btn-primary text-base px-6 py-3">
          Get started — it&apos;s free <ArrowRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Hue Type · Multi-colour icon font builder</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-text-primary">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-6 hover:border-border-strong transition-colors">
      <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
    </div>
  );
}

function UseCaseCard({
  title,
  body,
  visual,
}: {
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="bg-bg rounded-lg p-8 mb-4 min-h-[140px] flex items-center justify-center">
        {visual}
      </div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
    </div>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.round(x).toString(16).padStart(2, "0"))
      .join("")
  );
}
