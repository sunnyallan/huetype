"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, Loader2 } from "lucide-react";
import { api, type Glyph } from "@/lib/api";

type Props = {
  projectId: string;
  jobId: string;
  fontName: string;
  glyphs: Glyph[];
};

type RGB = [number, number, number];

const FONT_FAMILY = "HueTypePreview";

export default function FontPreview({ projectId, jobId, fontName, glyphs }: Props) {
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  const [palette, setPalette] = useState<RGB[]>([]);
  const [originalPalette, setOriginalPalette] = useState<RGB[]>([]);
  const [size, setSize] = useState(80);
  const [bg, setBg] = useState("#0f0f0f");
  const [downloading, setDownloading] = useState<"ttf" | "woff2" | null>(null);
  const [downloadName, setDownloadName] = useState(fontName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch font + extract palette
  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { url } = await api.getDownloadUrl(projectId, jobId, "ttf");
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const colors = extractPalette(buf);
        setPalette(colors);
        setOriginalPalette(colors);

        const blob = new Blob([buf], { type: "font/ttf" });
        blobUrl = URL.createObjectURL(blob);
        setFontUrl(blobUrl);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load font");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [projectId, jobId]);

  // Inject @font-face + @font-palette-values
  useEffect(() => {
    if (!fontUrl || palette.length === 0) return;

    const styleId = "huetype-preview-style";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }

    const overrides = palette
      .map((c, i) => `${i} rgb(${c[0]},${c[1]},${c[2]})`)
      .join(",");

    el.textContent = `
      @font-face {
        font-family: "${FONT_FAMILY}";
        src: url("${fontUrl}") format("truetype");
      }
      @font-palette-values --huetype-custom {
        font-family: "${FONT_FAMILY}";
        override-colors: ${overrides};
      }
      .huetype-glyph {
        font-family: "${FONT_FAMILY}";
        font-palette: --huetype-custom;
      }
    `;

    return () => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
  }, [fontUrl, palette]);

  function setPaletteColor(idx: number, hex: string) {
    setPalette((prev) => prev.map((c, i) => (i === idx ? hexToRgb(hex) : c)));
  }

  function setAllColors(hex: string) {
    const rgb = hexToRgb(hex);
    setPalette(palette.map(() => rgb));
  }

  function resetPalette() {
    setPalette(originalPalette);
  }

  async function download(fmt: "ttf" | "woff2") {
    setDownloading(fmt);
    try {
      const { url } = await api.getDownloadUrl(projectId, jobId, fmt);
      const res = await fetch(url);
      const blob = await res.blob();
      const safeName = downloadName.trim().replace(/[^a-z0-9-]+/gi, "-") || "font";
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl;
      a.download = `${safeName}.${fmt}`;
      a.click();
      URL.revokeObjectURL(dl);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  if (loading)
    return (
      <div className="card p-8 text-center">
        <Loader2 className="animate-spin mx-auto mb-2 text-text-muted" size={20} />
        <p className="text-sm text-text-muted">Loading font…</p>
      </div>
    );

  if (error)
    return (
      <div className="card p-8 text-center text-red-400 text-sm">{error}</div>
    );

  return (
    <div className="space-y-4">
      {/* Glyph grid preview */}
      <div className="card p-6" style={{ background: bg }}>
        <p className="text-xs uppercase tracking-wider text-text-secondary mb-4">
          Glyphs
        </p>
        <div className="flex flex-wrap gap-6 justify-center">
          {glyphs.map((g) => (
            <div key={g.id} className="text-center">
              <span
                className="huetype-glyph block"
                style={{ fontSize: `${size}px`, lineHeight: 1 }}
              >
                {String.fromCodePoint(parseInt(g.codepoint, 16))}
              </span>
              <p className="text-[10px] text-text-muted mt-2 font-mono">
                {g.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Test drive */}
      <div className="card p-4">
        <label className="text-xs uppercase tracking-wider text-text-secondary block mb-2">
          Test drive
        </label>
        <TestDrive glyphs={glyphs} size={size} />
      </div>

      {/* Size + background */}
      <div className="card p-4 space-y-3">
        <div>
          <label className="text-xs text-text-secondary block mb-2">
            Size · {size}px
          </label>
          <input
            type="range"
            min="16"
            max="240"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-2">Background</label>
          <div className="flex gap-2">
            {["#0f0f0f", "#ffffff", "#7c6af5", "#f5f0e8", "#e74c3c", "#27ae60"].map(
              (c) => (
                <button
                  key={c}
                  onClick={() => setBg(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    bg === c ? "border-accent" : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* Palette */}
      {palette.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs uppercase tracking-wider text-text-secondary">
              Colours · {palette.length}
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary">All:</label>
              <input
                type="color"
                onChange={(e) => setAllColors(e.target.value)}
                className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded"
                title="Set all colours"
              />
              <button
                onClick={resetPalette}
                className="text-xs text-text-secondary hover:text-text-primary ml-2"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {palette.map((c, i) => (
              <input
                key={i}
                type="color"
                value={rgbToHex(c)}
                onChange={(e) => setPaletteColor(i, e.target.value)}
                className="w-9 h-9 bg-transparent border-0 cursor-pointer rounded"
                title={`Colour ${i + 1}`}
              />
            ))}
          </div>
          <p className="text-[10px] text-text-muted mt-3">
            Note: palette overrides only affect this preview. The downloaded font
            keeps its original baked-in colours.
          </p>
        </div>
      )}

      {/* Download */}
      <div className="card p-4">
        <label className="text-xs uppercase tracking-wider text-text-secondary block mb-2">
          Download as
        </label>
        <input
          type="text"
          value={downloadName}
          onChange={(e) => setDownloadName(e.target.value)}
          placeholder="Filename"
          className="input mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={() => download("ttf")}
            disabled={downloading !== null}
            className="btn-primary flex-1"
          >
            {downloading === "ttf" ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Download size={14} />
            )}{" "}
            TTF
          </button>
          <button
            onClick={() => download("woff2")}
            disabled={downloading !== null}
            className="btn-secondary flex-1"
          >
            {downloading === "woff2" ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Download size={14} />
            )}{" "}
            WOFF2
          </button>
        </div>
      </div>
    </div>
  );
}

function TestDrive({ glyphs, size }: { glyphs: Glyph[]; size: number }) {
  const allChars = useMemo(
    () =>
      glyphs.map((g) => String.fromCodePoint(parseInt(g.codepoint, 16))).join(""),
    [glyphs],
  );
  const [text, setText] = useState(allChars);

  useEffect(() => {
    setText(allChars);
  }, [allChars]);

  return (
    <>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input mb-3 font-mono text-xs"
        placeholder="Type or paste characters"
      />
      <div
        className="huetype-glyph break-all"
        style={{ fontSize: `${Math.min(size, 64)}px`, lineHeight: 1.3 }}
      >
        {text || "—"}
      </div>
    </>
  );
}

// ── Palette extraction from CPAL table ───────────────────────────────────────
function extractPalette(buf: ArrayBuffer): RGB[] {
  try {
    const view = new DataView(buf);

    // Read sfnt header
    const numTables = view.getUint16(4);
    let cpalOffset = -1;
    for (let i = 0; i < numTables; i++) {
      const off = 12 + i * 16;
      const tag = String.fromCharCode(
        view.getUint8(off),
        view.getUint8(off + 1),
        view.getUint8(off + 2),
        view.getUint8(off + 3),
      );
      if (tag === "CPAL") {
        cpalOffset = view.getUint32(off + 8);
        break;
      }
    }
    if (cpalOffset < 0) return [];

    // CPAL header
    const numPaletteEntries = view.getUint16(cpalOffset + 2);
    const colorRecordsArrayOffset = view.getUint32(cpalOffset + 8);

    const colors: RGB[] = [];
    for (let i = 0; i < numPaletteEntries; i++) {
      const o = cpalOffset + colorRecordsArrayOffset + i * 4;
      const b = view.getUint8(o);
      const g = view.getUint8(o + 1);
      const r = view.getUint8(o + 2);
      // alpha = view.getUint8(o + 3)
      colors.push([r, g, b]);
    }
    return colors;
  } catch {
    return [];
  }
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: RGB): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.round(x).toString(16).padStart(2, "0"))
      .join("")
  );
}
