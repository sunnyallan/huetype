"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, LogOut, FileText, Palette, Layers, Image as ImageIcon, ArrowLeft, ArrowRight } from "lucide-react";
import { api, type Project, type FontType } from "@/lib/api";
import { createClient } from "@/lib/supabase-browser";
import Loader from "@/components/loader";

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(params: {
    name: string;
    description: string;
    font_type: FontType;
    palette: string[];
  }) {
    setCreating(true);
    setError(null);
    try {
      const proj = await api.createProject(params);
      router.push(`/projects/${proj.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setCreating(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-2xl font-semibold">Hue Type</h1>
          <p className="text-text-secondary text-xs mt-1">{userEmail}</p>
        </div>
        <button onClick={signOut} className="btn-ghost">
          <LogOut size={14} /> Sign out
        </button>
      </header>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm uppercase tracking-wider text-text-secondary">
          Your fonts
        </h2>
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary"
        >
          <Plus size={14} /> New font
        </button>
      </div>

      {showNew && (
        <NewFontWizard
          onCancel={() => setShowNew(false)}
          onCreate={createProject}
          creating={creating}
        />
      )}

      {error && (
        <div className="card p-4 mb-4 border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader size="md" label="Loading your fonts…" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="text-text-secondary text-sm">
            No fonts yet. Create your first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card p-5 hover:border-border-strong transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium truncate">{p.name}</h3>
                <StatusBadge status={p.status} />
              </div>
              {p.description && (
                <p className="text-text-secondary text-xs mb-3 line-clamp-2">
                  {p.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-text-muted text-xs">
                  {p.glyph_count ?? 0} glyph{p.glyph_count === 1 ? "" : "s"}
                </p>
                <FontTypeBadge type={p.font_type} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const colors = {
    draft: "bg-bg-hover text-text-secondary",
    building: "bg-yellow-950 text-yellow-400",
    ready: "bg-green-950 text-green-400",
    error: "bg-red-950 text-red-400",
  } as const;

  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${colors[status]}`}
    >
      {status}
    </span>
  );
}

function FontTypeBadge({ type }: { type: FontType }) {
  const labels = {
    illustration: "Illustration",
    duo: "Duo-tone",
    tri: "Tri-tone",
  };
  return (
    <span className="text-[9px] uppercase tracking-wider text-text-muted">
      {labels[type] || type}
    </span>
  );
}

const TYPE_OPTIONS: {
  type: FontType;
  title: string;
  body: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "illustration",
    title: "Illustration / emoji",
    body: "Multi-colour artwork. The colours in your SVGs are baked into the font.",
    icon: <ImageIcon size={20} />,
  },
  {
    type: "duo",
    title: "Duo-tone icon",
    body: "Two global colours mapped to layer 1 and layer 2 of every icon.",
    icon: <Layers size={20} />,
  },
  {
    type: "tri",
    title: "Tri-tone icon",
    body: "Three global colours mapped to layers 1, 2, and 3 of every icon.",
    icon: <Palette size={20} />,
  },
];

const DEFAULT_PALETTES: Record<FontType, string[]> = {
  illustration: [],
  duo: ["#1a1a1a", "#7c6af5"],
  tri: ["#1a1a1a", "#7c6af5", "#ff6b9d"],
};

function NewFontWizard({
  onCancel,
  onCreate,
  creating,
}: {
  onCancel: () => void;
  onCreate: (p: {
    name: string;
    description: string;
    font_type: FontType;
    palette: string[];
  }) => void;
  creating: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<FontType>("illustration");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTES.illustration);

  function pickType(t: FontType) {
    setType(t);
    setPalette(DEFAULT_PALETTES[t]);
    setStep(2);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onCreate({ name, description: desc, font_type: type, palette });
  }

  if (step === 1) {
    return (
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-wider text-text-secondary">
            Step 1 of 2 · Choose font type
          </h3>
          <button onClick={onCancel} className="btn-ghost text-xs">
            Cancel
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.type}
              onClick={() => pickType(o.type)}
              className="text-left p-5 rounded-lg border border-border bg-bg-card hover:border-accent hover:bg-bg-hover transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-3">
                {o.icon}
              </div>
              <h4 className="font-medium mb-1">{o.title}</h4>
              <p className="text-xs text-text-secondary leading-relaxed">{o.body}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wider text-text-secondary">
          Step 2 of 2 ·{" "}
          {type === "illustration"
            ? "Illustration / emoji"
            : type === "duo"
              ? "Duo-tone icon"
              : "Tri-tone icon"}
        </h3>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn-ghost text-xs"
        >
          <ArrowLeft size={12} /> Change type
        </button>
      </div>

      <input
        type="text"
        placeholder="Font name (e.g. Sunny Icons)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        className="input"
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="input"
      />

      {(type === "duo" || type === "tri") && (
        <div>
          <label className="text-xs uppercase tracking-wider text-text-secondary block mb-2">
            Global palette
          </label>
          <div className="flex flex-wrap gap-3">
            {palette.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={c}
                  onChange={(e) => {
                    const next = [...palette];
                    next[i] = e.target.value;
                    setPalette(next);
                  }}
                  className="w-12 h-12 bg-transparent border-0 cursor-pointer rounded"
                />
                <span className="text-[10px] text-text-muted font-mono">
                  Layer {i + 1}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
            When you upload an SVG, its first fill colour becomes Layer 1, second
            becomes Layer 2{type === "tri" && ", third becomes Layer 3"}. Editable
            anytime — rebuild applies new colours to all glyphs.
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={creating} className="btn-primary">
          {creating ? "Creating…" : "Create font"} <ArrowRight size={12} />
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
