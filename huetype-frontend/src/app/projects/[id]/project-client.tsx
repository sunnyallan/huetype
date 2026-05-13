"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Trash2, Hammer, Check, Pencil } from "lucide-react";
import { api, type ProjectDetail, type Glyph, type FontJob } from "@/lib/api";
import FontPreview from "@/components/font-preview";
import Loader from "@/components/loader";
import { validateSvgFile } from "@/lib/svg-validate";
import { recolourSvg, svgToDataUrl } from "@/lib/svg-recolour";
import EditGlyphDialog from "@/components/edit-glyph-dialog";

const PROJECT_FONT_FAMILY = "HueTypeProjectFont";

export default function ProjectClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingGlyphId, setEditingGlyphId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [fontReady, setFontReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getProject(projectId);
      setProject(data);
      setNameInput(data.name);
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

  // Register the built font once so all glyph cards can render the real glyph
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
        styleEl.textContent = `
          @font-face {
            font-family: "${PROJECT_FONT_FAMILY}";
            src: url("${blobUrl}") format("truetype");
            font-display: block;
          }
        `;
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

  async function handleFiles(files: FileList) {
    if (!project) return;
    setUploading(true);
    setError(null);

    // Pre-validate all files client-side; collect errors
    const valid: File[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const result = await validateSvgFile(file, project.font_type);
      if (result.ok) {
        valid.push(file);
      } else {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      setError(errors.join("  •  "));
      if (valid.length === 0) {
        setUploading(false);
        return;
      }
    }

    try {
      for (const file of valid) {
        const name = file.name
          .replace(/\.svg$/i, "")
          .replace(/[^a-z0-9]+/gi, "_");
        await api.uploadGlyph(projectId, file, name);
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(glyphId: string) {
    if (!confirm("Delete this glyph?")) return;
    try {
      await api.deleteGlyph(projectId, glyphId);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleRename(glyphId: string, newName: string) {
    try {
      await api.updateGlyph(projectId, glyphId, { name: newName });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rename failed");
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

  async function saveName() {
    if (!project || nameInput === project.name) {
      setEditingName(false);
      return;
    }
    try {
      await api.updateProject(projectId, {
        name: nameInput,
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

  async function savePalette(palette: string[]) {
    if (!project) return;
    try {
      await api.updateProject(projectId, {
        name: project.name,
        description: project.description ?? "",
        font_type: project.font_type,
        palette,
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save palette");
    }
  }

  async function deleteProject() {
    if (!confirm(`Delete "${project?.name}" and all its glyphs? This cannot be undone.`))
      return;
    try {
      await api.deleteProject(projectId);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Loader size="md" label="Loading project…" />
      </main>
    );
  if (!project) return <p className="p-8 text-red-400 text-sm">Project not found</p>;

  const job = project.latest_job;
  const isBuilding = !!job && ["queued", "processing"].includes(job.status);
  const isReady = job?.status === "complete";

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto relative">
      {isBuilding && (
        <div className="fixed inset-0 z-40 bg-bg/85 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <Loader
            size="lg"
            label="Building your font…"
            longWaitMs={20000}
            longWaitLabel="nanoemoji is rasterising glyphs and assembling the COLR table. Hang tight."
          />
        </div>
      )}

      <div
        className={isBuilding ? "pointer-events-none select-none opacity-60 transition-opacity" : "transition-opacity"}
        aria-busy={isBuilding}
      >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 text-sm"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <header className="flex items-start justify-between mb-8 gap-4">
        <div className="flex-1 min-w-0">
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
              className="text-2xl font-semibold bg-transparent border-b border-accent outline-none w-full"
            />
          ) : (
            <h1
              className="text-2xl font-semibold cursor-text hover:text-accent"
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {project.name}
            </h1>
          )}
          {project.description && (
            <p className="text-text-secondary text-sm mt-1">{project.description}</p>
          )}
        </div>
        <button onClick={deleteProject} className="btn-ghost text-red-400">
          <Trash2 size={14} /> Delete
        </button>
      </header>

      {error && (
        <div className="card p-3 mb-4 border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 text-xs text-text-muted">
        <span className="px-2 py-0.5 rounded bg-bg-card border border-border">
          {project.font_type === "illustration"
            ? "Illustration"
            : project.font_type === "duo"
              ? "Duo-tone"
              : "Tri-tone"}
        </span>
        <span>· Click name above to rename</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: glyph management */}
        <section className="space-y-4">
          {(project.font_type === "duo" || project.font_type === "tri") && (
            <PaletteEditor
              palette={project.palette}
              onSave={savePalette}
            />
          )}

          <Dropzone onFiles={handleFiles} uploading={uploading} />

          {project.glyphs.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs uppercase tracking-wider text-text-secondary mb-3">
                Glyphs ({project.glyphs.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {project.glyphs.map((g) => (
                  <GlyphCard
                    key={g.id}
                    glyph={g}
                    fontFamily={fontReady ? PROJECT_FONT_FAMILY : null}
                    lastBuildAt={
                      project.latest_job?.status === "complete"
                        ? project.latest_job.completed_at
                        : null
                    }
                    fontType={project.font_type}
                    palette={project.palette}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onEdit={() => setEditingGlyphId(g.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <BuildPanel
            glyphCount={project.glyphs.length}
            job={job}
            building={building}
            onBuild={build}
          />
        </section>

        {/* Right: preview */}
        <section>
          {isReady && job ? (
            <FontPreview
              projectId={projectId}
              jobId={job.id}
              fontName={project.name}
              glyphs={project.glyphs}
            />
          ) : isBuilding ? (
            <div className="card p-12 flex flex-col items-center">
              <Loader
                size="lg"
                label="Building your font…"
                longWaitMs={20000}
                longWaitLabel="Almost there — nanoemoji is rasterising glyphs and assembling the COLR table."
              />
            </div>
          ) : project.glyphs.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-text-secondary text-sm">
                Upload some SVGs to get started
              </p>
            </div>
          ) : (
            <UnbuiltPreview project={project} />
          )}
        </section>
      </div>
      </div>

      {editingGlyphId &&
        (() => {
          const g = project.glyphs.find((x) => x.id === editingGlyphId);
          if (!g) return null;
          return (
            <EditGlyphDialog
              projectId={projectId}
              glyph={g}
              siblings={project.glyphs}
              fontType={project.font_type}
              onClose={() => setEditingGlyphId(null)}
              onSaved={load}
            />
          );
        })()}
    </main>
  );
}

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
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
      }}
      onClick={() => ref.current?.click()}
      className={`card p-8 text-center cursor-pointer transition-colors ${
        drag ? "border-accent bg-bg-hover" : "hover:border-border-strong"
      }`}
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
      <Upload size={24} className="mx-auto mb-2 text-text-muted" />
      <p className="text-sm text-text-secondary">
        {uploading ? "Uploading…" : "Drop SVGs here or click to upload"}
      </p>
      <p className="text-xs text-text-muted mt-1">Multiple files supported</p>
    </div>
  );
}

function GlyphCard({
  glyph,
  fontFamily,
  lastBuildAt,
  fontType,
  palette,
  onDelete,
  onRename,
  onEdit,
}: {
  glyph: Glyph;
  fontFamily: string | null;
  lastBuildAt: string | null;
  fontType: "illustration" | "duo" | "tri";
  palette: string[];
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void | Promise<void>;
  onEdit: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(glyph.name);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync if parent reloads project data
  useEffect(() => {
    if (!editing) setDraft(glyph.name);
  }, [glyph.name, editing]);

  // Decide if this glyph is in the most recent build
  const isInCurrentBuild =
    !!fontFamily &&
    !!lastBuildAt &&
    new Date(glyph.created_at).getTime() <= new Date(lastBuildAt).getTime();

  // For duo/tri-tone projects we recolour the SVG client-side so the preview
  // matches what the build will produce.
  useEffect(() => {
    if (isInCurrentBuild) {
      setPreviewUrl(null);
      return;
    }
    if (!glyph.svg_url) {
      setPreviewUrl(null);
      return;
    }
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

    return () => {
      cancelled = true;
    };
  }, [
    isInCurrentBuild,
    glyph.svg_url,
    fontType,
    palette.join(","),
  ]);

  function commit() {
    const next = draft.trim();
    if (!next || next === glyph.name) {
      setDraft(glyph.name);
      setEditing(false);
      return;
    }
    onRename(glyph.id, next);
    setEditing(false);
  }

  const codepointChar = String.fromCodePoint(parseInt(glyph.codepoint, 16));

  return (
    <div className="group relative bg-bg-hover rounded-lg p-3 flex flex-col items-center text-center">
      {/* Action buttons (hover) */}
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1 rounded hover:bg-bg text-text-secondary hover:text-text-primary"
          title="Edit glyph"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={() => onDelete(glyph.id)}
          className="p-1 rounded hover:bg-red-950 text-red-400"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Glyph thumbnail:
          - In current build → render from the font
          - Else if SVG preview available → render SVG (recoloured for duo/tri)
          - Else placeholder
       */}
      <div className="h-14 w-full flex items-center justify-center mb-1.5 relative">
        {isInCurrentBuild ? (
          <span
            style={{ fontFamily: fontFamily!, fontSize: "48px", lineHeight: 1 }}
          >
            {codepointChar}
          </span>
        ) : previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={glyph.name}
              className="h-12 w-12 object-contain"
              loading="lazy"
            />
            {fontFamily && (
              <span
                className="absolute top-0 right-0 text-[9px] text-yellow-400/90 px-1 rounded-sm"
                title="This glyph isn't in the last build — rebuild to include it"
              >
                ●
              </span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-text-muted leading-tight px-2 text-center">
            Preview available after build
          </span>
        )}
      </div>

      {/* Name (click or pencil to edit) */}
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(glyph.name);
              setEditing(false);
            }
          }}
          className="w-full text-xs font-medium text-center bg-bg border border-accent rounded px-1.5 py-0.5 outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setEditing(true);
            setTimeout(() => inputRef.current?.select(), 0);
          }}
          className="text-xs font-medium truncate w-full hover:text-accent cursor-text"
          title="Click to rename"
        >
          {glyph.name}
        </button>
      )}
      <p className="text-[10px] text-text-muted font-mono mt-0.5">
        U+{glyph.codepoint}
      </p>
    </div>
  );
}

function BuildPanel({
  glyphCount,
  job,
  building,
  onBuild,
}: {
  glyphCount: number;
  job: FontJob | null;
  building: boolean;
  onBuild: () => void;
}) {
  const isProcessing = job && ["queued", "processing"].includes(job.status);
  const isReady = job?.status === "complete";
  const isFailed = job?.status === "failed";

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Build font</h3>
          <p className="text-xs text-text-muted mt-1">
            {isProcessing
              ? "Processing — this takes ~30s"
              : isReady
                ? "Last build succeeded"
                : isFailed
                  ? "Last build failed"
                  : `${glyphCount} glyph${glyphCount === 1 ? "" : "s"} ready`}
          </p>
        </div>
        <button
          onClick={onBuild}
          disabled={building || !!isProcessing || glyphCount === 0}
          className="btn-primary"
        >
          {building || isProcessing ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />{" "}
              Building
            </>
          ) : isReady ? (
            <>
              <Check size={14} /> Rebuild
            </>
          ) : (
            <>
              <Hammer size={14} /> Build
            </>
          )}
        </button>
      </div>
      {isFailed && job?.error_message && (
        <pre className="mt-3 text-[10px] text-red-400 bg-bg overflow-auto max-h-32 p-2 rounded">
          {job.error_message.slice(0, 800)}
        </pre>
      )}
    </div>
  );
}

function UnbuiltPreview({ project }: { project: ProjectDetail }) {
  const [size, setSize] = useState(96);

  const noteText =
    project.font_type === "duo" || project.font_type === "tri"
      ? "Pre-build preview using your global palette. Hit Build to generate the actual font."
      : "Pre-build preview from your SVG sources. Hit Build to render them as a real colour font.";

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-text-secondary">
            Sample preview
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            Build the font to enable colour overrides, downloads, and text-drive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">Size</span>
          <input
            type="range"
            min="40"
            max="200"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-24 accent-accent"
          />
        </div>
      </div>

      <div className="bg-bg rounded-lg p-8 flex flex-wrap gap-6 justify-center min-h-[200px] items-center">
        {project.glyphs.map((g) => (
          <UnbuiltGlyphPreview
            key={g.id}
            glyph={g}
            size={size}
            fontType={project.font_type}
            palette={project.palette}
          />
        ))}
      </div>

      <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
        {noteText}
      </p>
    </div>
  );
}

function UnbuiltGlyphPreview({
  glyph,
  size,
  fontType,
  palette,
}: {
  glyph: Glyph;
  size: number;
  fontType: "illustration" | "duo" | "tri";
  palette: string[];
}) {
  const [recolouredUrl, setRecolouredUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // For duo/tri-tone, fetch the SVG, recolour it client-side, and embed as data URL
  useEffect(() => {
    let cancelled = false;

    if (fontType === "illustration" || !glyph.svg_url || palette.length === 0) {
      setRecolouredUrl(null);
      return;
    }

    (async () => {
      try {
        const res = await fetch(glyph.svg_url!);
        const text = await res.text();
        if (cancelled) return;
        setRecolouredUrl(svgToDataUrl(recolourSvg(text, palette)));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [glyph.svg_url, fontType, palette.join(",")]);

  const src =
    fontType !== "illustration" && recolouredUrl ? recolouredUrl : glyph.svg_url;

  if (failed || !src) {
    return (
      <div
        className="flex flex-col items-center gap-1 text-text-muted"
        style={{ width: size }}
      >
        <div
          className="border border-dashed border-border rounded flex items-center justify-center text-[9px] text-text-muted text-center px-1"
          style={{ width: size, height: size }}
        >
          Preview available after build
        </div>
        <span className="text-[10px] truncate w-full text-center">
          {glyph.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={glyph.name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain"
        loading="lazy"
      />
      <span className="text-[10px] text-text-muted truncate" style={{ maxWidth: size }}>
        {glyph.name}
      </span>
    </div>
  );
}

function PaletteEditor({
  palette,
  onSave,
}: {
  palette: string[];
  onSave: (palette: string[]) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string[]>(palette);
  const [saving, setSaving] = useState(false);

  // Sync when project palette refreshes from server
  useEffect(() => {
    setDraft(palette);
  }, [palette]);

  const dirty = draft.some((c, i) => c !== palette[i]);

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-text-secondary">
          Global palette
        </h3>
        {dirty && (
          <span className="text-[10px] text-yellow-400">
            Rebuild needed to apply
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {draft.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <input
              type="color"
              value={c}
              onChange={(e) => {
                const next = [...draft];
                next[i] = e.target.value;
                setDraft(next);
              }}
              className="w-12 h-12 bg-transparent border-0 cursor-pointer rounded"
            />
            <span className="text-[10px] text-text-muted font-mono">
              Layer {i + 1}
            </span>
          </div>
        ))}
      </div>
      {dirty && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary text-xs"
          >
            {saving ? "Saving…" : "Save palette"}
          </button>
          <button
            onClick={() => setDraft(palette)}
            className="btn-ghost text-xs"
          >
            Discard
          </button>
        </div>
      )}
      <p className="text-[10px] text-text-muted mt-3 leading-relaxed">
        These colours apply at build time. After saving, hit Build to regenerate
        all glyphs with the new palette.
      </p>
    </div>
  );
}
