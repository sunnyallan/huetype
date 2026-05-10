"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Trash2, Hammer, Download, Check } from "lucide-react";
import { api, type ProjectDetail, type Glyph, type FontJob } from "@/lib/api";
import FontPreview from "@/components/font-preview";

export default function ProjectClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
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

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".svg")) continue;
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

  async function handleDelete(glyphId: string) {
    if (!confirm("Delete this glyph?")) return;
    try {
      await api.deleteGlyph(projectId, glyphId);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
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
    return <p className="p-8 text-text-muted text-sm">Loading…</p>;
  if (!project) return <p className="p-8 text-red-400 text-sm">Project not found</p>;

  const job = project.latest_job;
  const isBuilding = job && ["queued", "processing"].includes(job.status);
  const isReady = job?.status === "complete";

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
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
              <div className="grid grid-cols-3 gap-2">
                {project.glyphs.map((g) => (
                  <GlyphCard key={g.id} glyph={g} onDelete={handleDelete} />
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
          ) : (
            <div className="card p-12 text-center">
              <p className="text-text-secondary text-sm">
                {isBuilding
                  ? "Building your font…"
                  : project.glyphs.length === 0
                    ? "Upload some SVGs to get started"
                    : "Build your font to preview it here"}
              </p>
            </div>
          )}
        </section>
      </div>
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
  onDelete,
}: {
  glyph: Glyph;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group relative bg-bg-hover rounded-lg p-3 text-center">
      <button
        onClick={() => onDelete(glyph.id)}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-950 text-red-400"
        title="Delete"
      >
        <Trash2 size={11} />
      </button>
      <p className="text-xs font-medium truncate">{glyph.name}</p>
      <p className="text-[10px] text-text-muted font-mono mt-1">
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
          {isProcessing ? (
            <>
              <span className="animate-pulse">●</span> Building
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
