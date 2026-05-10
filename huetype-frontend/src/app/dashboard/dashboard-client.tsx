"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, LogOut, FileText } from "lucide-react";
import { api, type Project } from "@/lib/api";
import { createClient } from "@/lib/supabase-browser";

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
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

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const proj = await api.createProject(newName, newDesc);
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
        <form onSubmit={createProject} className="card p-6 mb-6 space-y-3">
          <input
            type="text"
            placeholder="Font name (e.g. Sunny Icons)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
            className="input"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="input"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="card p-4 mb-4 border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-text-muted text-sm">Loading…</p>
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
              <p className="text-text-muted text-xs">
                {p.glyph_count ?? 0} glyph{p.glyph_count === 1 ? "" : "s"}
              </p>
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
