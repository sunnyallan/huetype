"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Check } from "lucide-react";
import { api, type ProjectDetail, type Glyph, type FontType } from "@/lib/api";
import Loader from "@/components/loader";
import { Logo } from "@/components/logo";
import { HueIcon } from "@/components/hue-icon";
import { validateSvgFile } from "@/lib/svg-validate";
import { recolourSvg, svgToDataUrl } from "@/lib/svg-recolour";

const PROJECT_FONT_FAMILY = "HueTypeProjectFont";

// ─── SVG colour utilities ────────────────────────────────────────────────────

/** Extract unique hex fill colours from raw SVG text */
function extractSvgColours(svgText: string): string[] {
  const seen = new Set<string>();
  for (const m of svgText.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)) {
    if (m[1].toLowerCase() !== "none") seen.add(m[1].toLowerCase());
  }
  return [...seen];
}

/** Replace every occurrence of one fill colour with another in SVG text */
function replaceSvgColour(svg: string, from: string, to: string): string {
  // case-insensitive replace for both upper/lower hex
  return svg.replace(new RegExp(`fill="${from}"`, "gi"), `fill="${to}"`);
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ProjectClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [editingGlyphId, setEditingGlyphId] = useState<string | null>(null);

  // Project-level edit state (right panel — no glyph selected)
  const [previewSize, setPreviewSize] = useState(40);
  const [previewBg, setPreviewBg] = useState("#ffffff");
  const [globalPalette, setGlobalPalette] = useState<string[]>([]);

  // Inline project-name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getProject(projectId);
      setProject(data);
      setNameInput(data.name);
      setGlobalPalette(data.palette);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while building
  useEffect(() => {
    if (
      project?.latest_job &&
      ["queued", "processing"].includes(project.latest_job.status)
    ) {
      pollRef.current = setInterval(load, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [project?.latest_job?.status, load, project?.latest_job]);

  // Register built font for glyph-card rendering
  const lastJobId = project?.latest_job?.id;
  const isLatestComplete = project?.latest_job?.status === "complete";
  useEffect(() => {
    if (!isLatestComplete || !lastJobId) {
      setFontReady(false);
      return;
    }
    let cancelled = false;
    let blobUrl: string | null = null;
    let styleEl: HTMLStyleElement | null = null;
    (async () => {
      try {
        const { url } = await api.getDownloadUrl(projectId, lastJobId, "ttf");
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        blobUrl = URL.createObjectURL(new Blob([buf], { type: "font/ttf" }));
        styleEl = document.createElement("style");
        styleEl.textContent = `@font-face { font-family: "${PROJECT_FONT_FAMILY}"; src: url("${blobUrl}") format("truetype"); font-display: block; }`;
        document.head.appendChild(styleEl);
        setFontReady(true);
      } catch {
        setFontReady(false);
      }
    })();
    return () => {
      cancelled = true;
      setFontReady(false);
      if (styleEl?.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [projectId, lastJobId, isLatestComplete]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleFiles(files: FileList) {
    if (!project) return;
    setUploading(true);
    setError(null);
    const valid: File[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const result = await validateSvgFile(file, project.font_type);
      if (result.ok) valid.push(file);
      else errors.push(result.error);
    }
    if (errors.length > 0) {
      setError(errors.join("  •  "));
      if (valid.length === 0) { setUploading(false); return; }
    }
    try {
      for (const file of valid) {
        const name = file.name.replace(/\.svg$/i, "").replace(/[^a-z0-9]+/gi, "_");
        await api.uploadGlyph(projectId, file, name);
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function build() {
    setBuilding(true);
    setError(null);
    try {
      await api.createJob(projectId);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Build failed");
    } finally {
      setBuilding(false);
    }
  }

  async function saveAndBuild() {
    if (!project) return;
    setError(null);
    // Persist palette changes for duo/tri first
    if (project.font_type !== "illustration") {
      try {
        await api.updateProject(projectId, {
          name: project.name,
          description: project.description ?? "",
          font_type: project.font_type,
          palette: globalPalette,
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save palette");
        return;
      }
    }
    await build();
  }

  async function download(fmt: "ttf" | "woff2") {
    if (!project?.latest_job) return;
    try {
      const { url } = await api.getDownloadUrl(projectId, project.latest_job.id, fmt);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  async function saveName() {
    if (!project || nameInput.trim() === project.name) {
      setEditingName(false);
      return;
    }
    try {
      await api.updateProject(projectId, {
        name: nameInput.trim(),
        description: project.description ?? "",
        font_type: project.font_type,
        palette: project.palette,
      });
      setEditingName(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to rename");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <main className="ht-app min-h-screen flex items-center justify-center">
        <Loader size="md" label="Loading project…" />
      </main>
    );
  if (!project)
    return <p className="p-8 text-red-400 text-sm">Project not found</p>;

  const job = project.latest_job;
  const isBuilding = !!job && ["queued", "processing"].includes(job.status);
  const isReady = job?.status === "complete";
  const editingGlyph = editingGlyphId
    ? (project.glyphs.find((g) => g.id === editingGlyphId) ?? null)
    : null;

  return (
    <main className="ht-app min-h-screen flex flex-col">
      {/* Build overlay */}
      {isBuilding && (
        <div className="fixed inset-0 z-40 bg-ht-bg/85 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <Loader
            size="lg"
            label="Building your font…"
            longWaitMs={20000}
            longWaitLabel="nanoemoji is rasterising glyphs and assembling the COLR table. Hang tight."
          />
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-5 px-10 pt-8 pb-5">
        <Logo size={48} className="shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Editable project name */}
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setNameInput(project.name);
                    setEditingName(false);
                  }
                }}
                className="text-lg font-semibold bg-transparent border-b border-ht-ink outline-none text-ht-ink"
              />
            ) : (
              <>
                <h1 className="text-lg font-semibold text-ht-ink">
                  {project.name}
                </h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-ht-ink/30 hover:text-ht-ink transition-colors duration-200 ease-in-out"
                  aria-label="Rename project"
                >
                  <HueIcon glyph="edit" size={14} palette="ink" />
                </button>
              </>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-ht-ink/60 mt-0.5 truncate">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="ht-chip gap-1.5">
              <HueIcon
                glyph={
                  project.font_type === "illustration"
                    ? "illustration"
                    : project.font_type === "duo"
                      ? "duoTone"
                      : "triTone"
                }
                size={12}
                palette={project.font_type === "duo" ? "duo" : project.font_type === "tri" ? "brand" : "default"}
              />
              {project.font_type === "illustration"
                ? "Illustration"
                : project.font_type === "duo"
                  ? "Duo-tone"
                  : "Tri-tone"}
            </span>
            <span className="ht-chip">{project.glyphs.length} Glyphs</span>
          </div>
        </div>

        {/* Close — back to dashboard */}
        <button
          onClick={() => router.push("/dashboard")}
          className="shrink-0 bg-ht-white rounded-ht-md shadow-ht-soft p-3 border border-transparent hover:border-ht-line transition-colors duration-200 ease-in-out"
          aria-label="Back to dashboard"
        >
          <HueIcon glyph="close" size={20} palette="ink" />
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-10 mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-ht-md px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Two-panel body ──────────────────────────────────────────────── */}
      <div
        className={[
          "flex flex-1 gap-5 px-10 pb-10 min-h-0",
          isBuilding ? "pointer-events-none select-none opacity-60" : "",
        ].join(" ")}
        aria-busy={isBuilding}
      >
        {/* Left: upload dropzone + glyph grid */}
        <section className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
          <Dropzone onFiles={handleFiles} uploading={uploading} />

          {project.glyphs.length > 0 && (
            <div className="ht-card">
              <div className="grid grid-cols-6 gap-3">
                {project.glyphs.map((g) => (
                  <GlyphCard
                    key={g.id}
                    glyph={g}
                    fontFamily={fontReady ? PROJECT_FONT_FAMILY : null}
                    lastBuildAt={isReady ? (job?.completed_at ?? null) : null}
                    fontType={project.font_type}
                    palette={globalPalette}
                    isEditing={g.id === editingGlyphId}
                    iconSize={previewSize}
                    previewBg={previewBg}
                    onClick={() =>
                      setEditingGlyphId(
                        g.id === editingGlyphId ? null : g.id,
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {project.glyphs.length === 0 && (
            <div className="ht-card flex-1 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-ht-ink/50">
                Upload SVGs to get started
              </p>
            </div>
          )}
        </section>

        {/* Right: editing panel */}
        <aside className="w-[380px] shrink-0 flex flex-col gap-4">
          {editingGlyph ? (
            <GlyphEditPanel
              key={editingGlyph.id}
              projectId={projectId}
              glyph={editingGlyph}
              siblings={project.glyphs}
              fontType={project.font_type}
              globalPalette={globalPalette}
              fontFamily={fontReady ? PROJECT_FONT_FAMILY : null}
              previewBg={previewBg}
              onClose={() => setEditingGlyphId(null)}
              onSaved={async () => {
                await load();
                setEditingGlyphId(null);
              }}
              onDeleted={async () => {
                await load();
                setEditingGlyphId(null);
              }}
              onBuild={build}
              onPaletteChange={setGlobalPalette}
            />
          ) : (
            <ProjectEditPanel
              projectName={project.name}
              fontType={project.font_type}
              previewSize={previewSize}
              previewBg={previewBg}
              globalPalette={globalPalette}
              isReady={isReady}
              building={building || isBuilding}
              glyphCount={project.glyphs.length}
              onSizeChange={setPreviewSize}
              onBgChange={setPreviewBg}
              onPaletteChange={setGlobalPalette}
              onSaveAndBuild={saveAndBuild}
              onDownload={download}
            />
          )}
        </aside>
      </div>
    </main>
  );
}

// ─── Dropzone ────────────────────────────────────────────────────────────────

function Dropzone({
  onFiles,
  uploading,
}: {
  onFiles: (files: FileList) => void;
  uploading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
      }}
      onClick={() => ref.current?.click()}
      className={[
        "rounded-ht-xl border-2 border-dashed p-8 text-center cursor-pointer",
        "transition-colors duration-200 ease-in-out",
        drag
          ? "border-ht-ink bg-ht-surface"
          : "border-ht-line/40 hover:border-ht-line bg-ht-surface/50",
      ].join(" ")}
    >
      <input
        ref={ref}
        type="file"
        multiple
        accept=".svg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-3">
        <span className="size-9 rounded-lg bg-ht-lime flex items-center justify-center">
          <HueIcon glyph="upload" size={20} palette="ink" />
        </span>
        <div>
          <p className="text-sm font-medium text-ht-ink">
            {uploading ? "Uploading…" : "Drag SVG's here or click to upload"}
          </p>
          <p className="text-xs text-ht-ink/50 mt-0.5">Multiple files supported</p>
        </div>
      </div>
    </div>
  );
}

// ─── Glyph card ──────────────────────────────────────────────────────────────

function GlyphCard({
  glyph,
  fontFamily,
  lastBuildAt,
  fontType,
  palette,
  isEditing,
  iconSize,
  previewBg,
  onClick,
}: {
  glyph: Glyph;
  fontFamily: string | null;
  lastBuildAt: string | null;
  fontType: FontType;
  palette: string[];
  isEditing: boolean;
  iconSize: number;
  previewBg: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isInCurrentBuild =
    !!fontFamily &&
    !!lastBuildAt &&
    new Date(glyph.created_at).getTime() <= new Date(lastBuildAt).getTime();

  // Recolour SVG preview for duo/tri before build
  useEffect(() => {
    if (isInCurrentBuild) { setPreviewUrl(null); return; }
    if (!glyph.svg_url) { setPreviewUrl(null); return; }
    if (fontType === "illustration" || palette.length === 0) {
      setPreviewUrl(glyph.svg_url);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(glyph.svg_url!);
        const text = await res.text();
        if (cancelled) return;
        setPreviewUrl(svgToDataUrl(recolourSvg(text, palette)));
      } catch {
        if (!cancelled) setPreviewUrl(glyph.svg_url ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [isInCurrentBuild, glyph.svg_url, fontType, palette.join(",")]);

  const codepointChar = String.fromCodePoint(parseInt(glyph.codepoint, 16));
  const clampedSize = Math.min(iconSize, 56); // clamp to fit inside 96px card

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "relative flex flex-col items-center justify-between p-2 rounded-ht-lg text-center",
        "w-24 h-24 shrink-0", // 96×96
        "border transition-colors duration-200 ease-in-out",
        isEditing
          ? "bg-ht-lime border-ht-ink"
          : "bg-[#f7f8f8] border-transparent hover:border-ht-line",
      ].join(" ")}
    >
      {/* Icon — fills available space above the label row */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-hidden"
        style={{ background: "transparent" }}
      >
        {isInCurrentBuild ? (
          <span style={{ fontFamily: fontFamily!, fontSize: clampedSize, lineHeight: 1 }}>
            {codepointChar}
          </span>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={glyph.name}
            style={{ width: clampedSize, height: clampedSize }}
            className="object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-[8px] text-ht-ink/40 leading-tight px-1 text-center">
            Build to preview
          </span>
        )}
      </div>

      {/* Name + codepoint */}
      <div className="w-full">
        <p className="text-[9px] font-medium text-ht-ink truncate w-full leading-tight">
          {glyph.name}
        </p>
        <p className="text-[8px] text-ht-ink/50 font-mono leading-tight">
          {glyph.codepoint.toUpperCase()}
        </p>
      </div>

      {/* Hover / editing overlay label */}
      {(hovered || isEditing) && (
        <div
          className={[
            "absolute top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap",
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium",
            isEditing
              ? "bg-ht-ink text-ht-white"
              : "bg-ht-white text-ht-ink shadow-ht-soft border border-ht-line",
          ].join(" ")}
        >
          <Pencil size={8} />
          {isEditing ? "Editing" : "Edit"}
        </div>
      )}
    </button>
  );
}

// ─── Project edit panel (right, no glyph selected) ───────────────────────────

function ProjectEditPanel({
  projectName,
  fontType,
  previewSize,
  previewBg,
  globalPalette,
  isReady,
  building,
  glyphCount,
  onSizeChange,
  onBgChange,
  onPaletteChange,
  onSaveAndBuild,
  onDownload,
}: {
  projectName: string;
  fontType: FontType;
  previewSize: number;
  previewBg: string;
  globalPalette: string[];
  isReady: boolean;
  building: boolean;
  glyphCount: number;
  onSizeChange: (v: number) => void;
  onBgChange: (v: string) => void;
  onPaletteChange: (p: string[]) => void;
  onSaveAndBuild: () => void;
  onDownload: (fmt: "ttf" | "woff2") => void;
}) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="ht-card flex flex-col gap-6 flex-1">
      <h2 className="text-base font-semibold text-ht-ink">
        Editing {projectName}
      </h2>

      {/* Size slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-ht-ink">Size</span>
          <span className="text-sm text-ht-ink/60">{previewSize}px</span>
        </div>
        <input
          type="range"
          min={40}
          max={200}
          value={previewSize}
          onChange={(e) => onSizeChange(parseInt(e.target.value))}
          className="ht-size-slider w-full"
          style={{
            background: `linear-gradient(to right,
              #eefa94 0%,
              #eefa94 ${((previewSize - 40) / 160) * 100}%,
              #dce2de ${((previewSize - 40) / 160) * 100}%,
              #dce2de 100%)`,
          }}
        />
      </div>

      {/* Type Colours — duo/tri only */}
      {(fontType === "duo" || fontType === "tri") && globalPalette.length > 0 && (
        <div>
          <p className="text-sm text-ht-ink mb-3">Type Colours</p>
          <div className="flex flex-wrap gap-3">
            {globalPalette.map((c, i) => (
              <label key={i} className="cursor-pointer">
                <input
                  type="color"
                  value={c}
                  onChange={(e) => {
                    const next = [...globalPalette];
                    next[i] = e.target.value;
                    onPaletteChange(next);
                  }}
                  className="sr-only"
                />
                <span
                  className="block size-12 rounded-full border-2 border-ht-line/30 hover:border-ht-ink transition-colors duration-200 ease-in-out shadow-sm"
                  style={{ backgroundColor: c }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Background */}
      <div>
        <p className="text-sm text-ht-ink mb-3">Background</p>
        <label className="cursor-pointer">
          <input
            type="color"
            value={previewBg}
            onChange={(e) => onBgChange(e.target.value)}
            className="sr-only"
          />
          <span
            className="block size-12 rounded-full border-2 border-ht-line/30 hover:border-ht-ink transition-colors duration-200 ease-in-out shadow-sm"
            style={{ backgroundColor: previewBg }}
          />
        </label>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save + Download */}
      <div className="flex gap-3">
        {/* Save = build */}
        <button
          onClick={onSaveAndBuild}
          disabled={building || glyphCount === 0}
          className="flex-1 ht-btn bg-ht-white border border-ht-line text-ht-ink py-4 hover:border-ht-ink transition-colors duration-200 ease-in-out disabled:opacity-40"
        >
          {building ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full border-2 border-ht-ink border-t-transparent animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <HueIcon glyph="swap" size={16} palette="ink" />
              Save
            </>
          )}
        </button>

        {/* Download dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDownloadMenu((v) => !v)}
            disabled={!isReady}
            className="ht-btn bg-ht-ink text-ht-white py-4 px-5 hover:opacity-90 transition-opacity disabled:opacity-40 gap-2"
          >
            <HueIcon glyph="download" size={16} palette="light-lime" />
            Download
            <ChevronDown size={14} className={`transition-transform duration-200 ${showDownloadMenu ? "rotate-180" : ""}`} />
          </button>
          {showDownloadMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-ht-white rounded-ht-md shadow-ht-card border border-ht-line overflow-hidden min-w-[140px]">
              {(["ttf", "woff2"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => { onDownload(fmt); setShowDownloadMenu(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-ht-ink hover:bg-ht-surface transition-colors duration-150 uppercase font-mono tracking-wider"
                >
                  .{fmt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Glyph edit panel (right, single icon selected) ──────────────────────────

function GlyphEditPanel({
  projectId,
  glyph,
  siblings,
  fontType,
  globalPalette,
  fontFamily,
  previewBg,
  onClose,
  onSaved,
  onDeleted,
  onBuild,
  onPaletteChange,
}: {
  projectId: string;
  glyph: Glyph;
  siblings: Glyph[];
  fontType: FontType;
  globalPalette: string[];
  fontFamily: string | null;
  previewBg: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onBuild: () => void;
  onPaletteChange: (p: string[]) => void;
}) {
  const [name, setName] = useState(glyph.name);
  const [codepoint, setCodepoint] = useState(glyph.codepoint);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [svgColours, setSvgColours] = useState<string[]>([]);
  const [editedColours, setEditedColours] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Fetch and parse SVG colours on mount (illustration only)
  useEffect(() => {
    if (fontType !== "illustration" || !glyph.svg_url) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(glyph.svg_url!);
        const text = await res.text();
        if (cancelled) return;
        setSvgText(text);
        const colours = extractSvgColours(text);
        setSvgColours(colours);
        setEditedColours(colours);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [glyph.svg_url, fontType]);

  const codepointChar = String.fromCodePoint(parseInt(glyph.codepoint, 16));
  const isBuilt = !!fontFamily;

  // Validation
  const siblingNames = new Set(
    siblings.filter((g) => g.id !== glyph.id).map((g) => g.name.toLowerCase()),
  );
  const siblingCodepoints = new Set(
    siblings.filter((g) => g.id !== glyph.id).map((g) => g.codepoint.toUpperCase()),
  );
  const nameError =
    !name.trim()
      ? "Required"
      : siblingNames.has(name.trim().toLowerCase())
        ? "Already used"
        : null;
  const cpRaw = codepoint.trim().replace(/^u\+/i, "");
  const cpNum = parseInt(cpRaw, 16);
  const codepointError =
    !cpRaw
      ? "Required"
      : !/^[0-9a-fA-F]+$/.test(cpRaw)
        ? "Must be hex"
        : cpNum < 0xe001 || cpNum > 0xf8ff
          ? "Must be E001–F8FF"
          : siblingCodepoints.has(cpRaw.toUpperCase().padStart(4, "0"))
            ? "Already used"
            : null;

  async function handleReplaceSvg(file: File) {
    setError(null);
    const result = await validateSvgFile(file, fontType);
    if (!result.ok) { setError(result.error); return; }
    setPendingFile(file);
    // Update local SVG preview for illustration colour editing
    if (fontType === "illustration") {
      const text = await file.text();
      setSvgText(text);
      const colours = extractSvgColours(text);
      setSvgColours(colours);
      setEditedColours(colours);
    }
  }

  async function saveAndClose() {
    if (nameError || codepointError) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Update metadata
      await api.updateGlyph(projectId, glyph.id, {
        name: name.trim(),
        codepoint: cpRaw.toUpperCase().padStart(4, "0"),
      });

      // 2. For illustration: apply colour edits to SVG and re-upload
      if (fontType === "illustration" && svgText) {
        const coloursDirty = editedColours.some((c, i) => c !== svgColours[i]);
        if (coloursDirty) {
          let modified = svgText;
          svgColours.forEach((orig, i) => {
            if (editedColours[i] !== orig) {
              modified = replaceSvgColour(modified, orig, editedColours[i]);
            }
          });
          const blob = new Blob([modified], { type: "image/svg+xml" });
          const file = new File([blob], `${name}.svg`, { type: "image/svg+xml" });
          await api.replaceGlyphSvg(projectId, glyph.id, file);
        }
      }

      // 3. Replace SVG if user picked a new file
      if (pendingFile) {
        await api.replaceGlyphSvg(projectId, glyph.id, pendingFile);
      }

      // 4. For duo/tri: colour swatches == global palette, save it
      if (fontType !== "illustration") {
        await api.updateProject(projectId, {
          name: glyph.name, // project name fetched from parent — we just pass current
          description: "",
          font_type: fontType,
          palette: globalPalette,
        });
      }

      // 5. Build
      await onBuild();
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGlyph() {
    if (!confirm(`Delete "${glyph.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteGlyph(projectId, glyph.id);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  // Colours to show: illustration → per-icon extracted, duo/tri → global palette
  const displayColours =
    fontType === "illustration" ? editedColours : globalPalette;

  function updateColour(i: number, val: string) {
    if (fontType === "illustration") {
      const next = [...editedColours];
      next[i] = val;
      setEditedColours(next);
    } else {
      const next = [...globalPalette];
      next[i] = val;
      onPaletteChange(next);
    }
  }

  return (
    <div className="ht-card flex flex-col gap-5 flex-1">
      {/* Header: icon preview + title */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-ht-md flex items-center justify-center shrink-0"
          style={{ background: previewBg }}
        >
          {isBuilt ? (
            <span style={{ fontFamily: fontFamily!, fontSize: 28, lineHeight: 1 }}>
              {codepointChar}
            </span>
          ) : glyph.svg_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={glyph.svg_url} alt={name} className="w-7 h-7 object-contain" />
          ) : null}
        </div>
        <h2 className="text-base font-semibold text-ht-ink">
          Editing {name || glyph.name}
        </h2>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-ht-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Name */}
      <div>
        <label className="text-xs text-ht-ink/60 block mb-1.5">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`ht-input ${nameError ? "border-red-400" : ""}`}
          placeholder="e.g. heart"
        />
        {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
      </div>

      {/* Unicode */}
      <div>
        <label className="text-xs text-ht-ink/60 block mb-1.5">Unicode</label>
        <input
          value={codepoint}
          onChange={(e) => setCodepoint(e.target.value)}
          className={`ht-input font-mono ${codepointError ? "border-red-400" : ""}`}
          placeholder="e.g. E001"
        />
        {codepointError && (
          <p className="text-xs text-red-500 mt-1">{codepointError}</p>
        )}
      </div>

      {/* Colours */}
      {displayColours.length > 0 && (
        <div>
          <p className="text-xs text-ht-ink/60 mb-2">Colours</p>
          <div className="flex flex-wrap gap-2">
            {displayColours.map((c, i) => (
              <label key={i} className="cursor-pointer" title={c}>
                <input
                  type="color"
                  value={c}
                  onChange={(e) => updateColour(i, e.target.value)}
                  className="sr-only"
                />
                <span
                  className="block size-10 rounded-full border-2 border-ht-line/30 hover:border-ht-ink transition-colors duration-200 ease-in-out shadow-sm"
                  style={{ backgroundColor: c }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Replace SVG */}
      <div>
        <input
          ref={replaceInputRef}
          type="file"
          accept=".svg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleReplaceSvg(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => replaceInputRef.current?.click()}
          className="w-full ht-btn bg-ht-white border border-ht-line text-ht-ink py-4 hover:border-ht-ink transition-colors duration-200 ease-in-out"
        >
          <HueIcon glyph="swap" size={16} palette="ink" />
          {pendingFile ? `Replace: ${pendingFile.name}` : "Replace SVG"}
        </button>
      </div>

      <div className="flex-1" />

      {/* Delete + Save & Close */}
      <div className="flex gap-3">
        <button
          onClick={deleteGlyph}
          disabled={deleting || saving}
          className="flex-1 ht-btn bg-red-50 border border-red-200 text-red-600 py-4 hover:border-red-400 hover:bg-red-100 transition-colors duration-200 ease-in-out disabled:opacity-40"
        >
          <HueIcon glyph="close" size={16} palette="ink" />
          Delete Icon
        </button>
        <button
          onClick={saveAndClose}
          disabled={saving || deleting || !!nameError || !!codepointError}
          className="flex-1 ht-btn bg-ht-ink text-ht-white py-4 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check size={14} />
              Save & Close
            </>
          )}
        </button>
      </div>
    </div>
  );
}
