"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Plus,
  ArrowLeft,
  ArrowRight,
  X,
  BookOpen,
} from "lucide-react";
import { api, type Project, type FontType } from "@/lib/api";
import { createClient } from "@/lib/supabase-browser";
import Loader from "@/components/loader";
import { Logo } from "@/components/logo";
import { useProjectFont } from "@/lib/use-project-font";
import { HueIcon, HUE, type HuePalette } from "@/components/hue-icon";

type Tab = "active" | "archived";

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

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

  const activeProjects = projects;
  const archivedProjects: Project[] = []; // No archived state in DB yet.
  const visibleProjects = tab === "active" ? activeProjects : archivedProjects;

  return (
    <main className="ht-app min-h-screen relative max-w-[1440px] mx-auto w-full">
      {/* ── Logo top-left ────────────────────────────────────────────── */}
      <div className="absolute top-9 left-12">
        <Logo size={56} />
      </div>

      {/* ── Page content ─────────────────────────────────────────────── */}
      <div className="px-[140px] pt-[43px] pb-32">
        {/* Welcome chip */}
        <span className="inline-flex items-center bg-ht-lime text-ht-ink font-semibold text-lg rounded-ht-md px-5 py-2.5">
          Welcome back!
        </span>

        {/* Hero + CTA row */}
        <div className="mt-7 flex items-start justify-between gap-8">
          <h1 className="text-[36px] leading-tight text-ht-ink max-w-2xl">
            Create hues of icons,
            <br />
            illustrations and typography
          </h1>
          <NewTypeButton onClick={() => setShowNew(true)} />
        </div>

        {/* Tabs */}
        <div className="mt-16 flex items-center gap-3">
          <button
            onClick={() => setTab("active")}
            className={tab === "active" ? "ht-btn-pill-active" : "ht-btn-pill"}
          >
            {activeProjects.length} Active
          </button>
          <button
            onClick={() => setTab("archived")}
            className={tab === "archived" ? "ht-btn-pill-active" : "ht-btn-pill"}
          >
            {archivedProjects.length} Archived
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 ht-card text-red-700 text-sm border border-red-300 bg-red-50">
            {error}
          </div>
        )}

        {/* Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="py-24 flex justify-center">
              <Loader size="md" label="Loading your fonts…" />
            </div>
          ) : visibleProjects.length === 0 ? (
            <EmptyState
              tab={tab}
              onCreate={() => setShowNew(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {visibleProjects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating profile (bottom-left) ───────────────────────────── */}
      <ProfileChip email={userEmail} onSignOut={signOut} />

      {/* ── New Type modal ───────────────────────────────────────────── */}
      {showNew && (
        <NewFontModal
          onCancel={() => setShowNew(false)}
          onCreate={createProject}
          creating={creating}
        />
      )}
    </main>
  );
}

/* ─── New Type button ───────────────────────────────────────────────── */
function NewTypeButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "ht-btn whitespace-nowrap px-10 py-5 border",
        "transition-all duration-300 ease-in-out",
        hovered
          ? "bg-[#f7f8f8] text-ht-ink border-ht-ink"
          : "bg-ht-ink text-[#f7f8f8] border-transparent",
      ].join(" ")}
    >
      {/* Two icons stacked — opacity crossfade gives smooth ease */}
      <span className="relative inline-block ht-icon-stack" style={{ width: 24, height: 24 }}>
        <HueIcon
          glyph="newType"
          size={24}
          palette="default"
          style={{
            position: "absolute",
            inset: 0,
            opacity: hovered ? 0 : 1,
            transition: "opacity 300ms ease-in-out",
          }}
        />
        <HueIcon
          glyph="newType"
          size={24}
          palette="brand"
          style={{
            position: "absolute",
            inset: 0,
            opacity: hovered ? 1 : 0,
            transition: "opacity 300ms ease-in-out",
          }}
        />
      </span>
      <span className="text-sm font-normal">New Type</span>
    </button>
  );
}

/* ─── Project card ──────────────────────────────────────────────────── */
function ProjectCard({ project }: { project: Project }) {
  const { font, loading } = useProjectFont(project.id);
  const [hovering, setHovering] = useState(false);
  const [glyphIdx, setGlyphIdx] = useState(0);
  const [paletteIdx, setPaletteIdx] = useState(0);

  // Cycle glyph + palette on hover
  useEffect(() => {
    if (!hovering || !font || font.glyphs.length === 0) return;
    const id = setInterval(() => {
      setGlyphIdx((i) => (i + 1) % font.glyphs.length);
      setPaletteIdx((i) => (i + 1) % font.paletteVariants.length);
    }, 450);
    return () => clearInterval(id);
  }, [hovering, font]);

  // Reset to first glyph/palette when leaving
  useEffect(() => {
    if (!hovering) {
      setGlyphIdx(0);
      setPaletteIdx(0);
    }
  }, [hovering]);

  // ── Skeleton while font is loading ──────────────────────────────────────
  if (loading) {
    return (
      <div className="ht-card flex items-center gap-[18px]">
        {/* Thumbnail skeleton */}
        <div className="bg-ht-surface animate-pulse rounded-ht-lg shrink-0 size-[124px]" />
        {/* Text skeleton */}
        <div className="flex-1 flex flex-col gap-2.5 py-1">
          <div className="h-4 bg-ht-surface animate-pulse rounded-full w-32" />
          <div className="h-3 bg-ht-surface animate-pulse rounded-full w-20" />
          <div className="mt-3 h-7 bg-ht-surface animate-pulse rounded-full w-28" />
        </div>
      </div>
    );
  }

  const currentGlyph = font?.glyphs[glyphIdx];
  const glyphChar = currentGlyph
    ? String.fromCodePoint(parseInt(currentGlyph.codepoint, 16))
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="ht-card flex items-center gap-[18px] border border-transparent hover:border-ht-line transition-colors duration-200 ease-in-out group"
    >
      <div className="bg-ht-inner rounded-ht-lg shrink-0 size-[124px] flex items-center justify-center overflow-hidden">
        {font && glyphChar ? (
          <span
            key={glyphIdx + ":" + paletteIdx}
            className="leading-none transition-opacity duration-200"
            style={{
              fontFamily: font.fontFamily,
              fontPalette: font.paletteVariants[paletteIdx],
              fontSize: 72,
            } as React.CSSProperties}
          >
            {glyphChar}
          </span>
        ) : (
          <HueTypeFallbackThumb hovering={hovering} />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col self-stretch justify-between py-1">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base text-ht-ink truncate">
              {project.name}
            </p>
            {project.description && (
              <p className="text-xs text-ht-ink mt-1 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          <HueIcon
            glyph="goArrow"
            size={14}
            palette="arrow"
            className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <div className="flex items-center gap-1 mt-3">
          <span className="bg-ht-lime rounded-ht-sm p-1.5 flex items-center justify-center">
            <FontTypeIcon type={project.font_type} />
          </span>
          <span className="ht-chip whitespace-pre">
            {project.glyph_count ?? 0}  Glyphs
          </span>
        </div>
      </div>
    </Link>
  );
}

function HueTypeFallbackThumb({ hovering }: { hovering: boolean }) {
  // Static placeholder for projects that don't have a built font yet.
  // Shows the newType glyph — changes palette on hover to signal interactivity.
  return (
    <span
      className="ht-glyph"
      style={
        {
          fontFamily: "HueType",
          fontPalette: hovering ? "--ht-brand" : "--ht-ref",
          fontSize: 72,
          lineHeight: 1,
          transition: "font-palette 300ms ease-in-out",
        } as React.CSSProperties
      }
    >
      {HUE.newType}
    </span>
  );
}

function FontTypeIcon({ type }: { type: FontType }) {
  if (type === "duo")
    return <HueIcon glyph="duoTone" size={16} palette="duo" />;
  if (type === "illustration")
    return <HueIcon glyph="illustration" size={16} palette="default" />;
  return <HueIcon glyph="triTone" size={16} palette="default" />;
}

/* ─── Empty state ───────────────────────────────────────────────────── */
function EmptyState({
  tab,
  onCreate,
}: {
  tab: Tab;
  onCreate: () => void;
}) {
  if (tab === "archived") {
    return (
      <div className="ht-card text-center py-16 bg-ht-surface/60">
        <p className="text-ht-ink/70 text-sm">No archived projects.</p>
      </div>
    );
  }
  return (
    <div className="ht-card text-center py-16">
      <p className="text-ht-ink/70 text-sm mb-4">
        No fonts yet. Create your first one.
      </p>
      <button onClick={onCreate} className="ht-btn-primary">
        <Plus size={18} />
        <span className="text-sm">New Type</span>
      </button>
    </div>
  );
}

/* ─── Floating profile chip ─────────────────────────────────────────── */
function ProfileChip({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-40">
      {open && (
        <div className="mb-2 bg-ht-white rounded-ht-md shadow-ht-card p-3 min-w-[220px]">
          <p className="text-xs text-ht-ink/60 px-2 py-1 truncate">{email}</p>
          <a
            href="/docs.html"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 text-left px-2 py-2 rounded-lg text-sm text-ht-ink hover:bg-ht-bg"
          >
            <BookOpen size={14} /> Documentation
          </a>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 text-left px-2 py-2 rounded-lg text-sm text-ht-ink hover:bg-ht-bg"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
      <ProfileButton open={open} onToggle={() => setOpen((v) => !v)} email={email} />
    </div>
  );
}

/* ─── Profile button with palette crossfade (profile → close-hover) ── */
function ProfileButton({
  open,
  onToggle,
  email,
}: {
  open: boolean;
  onToggle: () => void;
  email: string;
}) {
  const [hovered, setHovered] = useState(false);
  // Open menu state counts as "active" — keep hover palette pinned when open
  const active = hovered || open;
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-ht-white rounded-ht-md shadow-ht-soft px-6 py-5 flex items-center justify-center"
      aria-label="Profile"
      title={email}
    >
      <span
        className="ht-icon-stack"
        style={{ position: "relative", display: "inline-flex", width: 32, height: 32, flexShrink: 0 }}
      >
        <HueIcon
          glyph="profile"
          size={32}
          palette="default"
          style={{ position: "absolute", inset: 0, transition: "opacity 300ms ease-in-out", opacity: active ? 0 : 1 }}
        />
        <HueIcon
          glyph="profile"
          size={32}
          palette="close-hover"
          style={{ position: "absolute", inset: 0, transition: "opacity 300ms ease-in-out", opacity: active ? 1 : 0 }}
        />
      </span>
    </button>
  );
}

/* ─── Type selection card (with icon crossfade on hover) ────────────── */
function TypeCard({
  option,
  onPick,
}: {
  option: (typeof TYPE_OPTIONS)[number];
  onPick: (t: FontType) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onPick(option.type)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 text-left p-4 rounded-ht-xl bg-ht-surface border border-transparent hover:border-ht-line transition-colors duration-200 ease-in-out"
    >
      {/* Icon thumbnail — crossfade between rest and hover palette */}
      <div className="shrink-0 size-[88px] rounded-ht-lg bg-ht-white flex items-center justify-center relative ht-icon-stack">
        <HueIcon
          glyph={option.glyph}
          size={56}
          palette={option.palette}
          style={{
            position: "absolute",
            opacity: hovered ? 0 : 1,
            transition: "opacity 300ms ease-in-out",
          }}
        />
        <HueIcon
          glyph={option.glyph}
          size={56}
          palette={option.hoverPalette}
          style={{
            position: "absolute",
            opacity: hovered ? 1 : 0,
            transition: "opacity 300ms ease-in-out",
          }}
        />
      </div>
      {/* Text */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-ht-ink text-sm mb-1.5">
          {option.title}
        </h4>
        <p className="text-xs text-ht-ink/60 leading-relaxed">{option.body}</p>
      </div>
    </button>
  );
}

/* ─── New Type modal ────────────────────────────────────────────────── */
const TYPE_OPTIONS: {
  type: FontType;
  title: string;
  body: string;
  glyph: string;
  palette: HuePalette;
  hoverPalette: HuePalette;
}[] = [
  {
    type: "duo",
    title: "Duo-tone",
    body: "A simple duotone icon font means 2 layers in a single SVG",
    glyph: "duoTone",
    palette: "duo",
    hoverPalette: "brand",
  },
  {
    type: "tri",
    title: "Tri-tone",
    body: "A 3 layered font which means your SVG can have 3 colours",
    glyph: "triTone",
    palette: "default",
    hoverPalette: "brand",
  },
  {
    type: "illustration",
    title: "Illustration",
    body: "A multi-colour font where SVG colours are baked directly into the font",
    glyph: "illustration",
    palette: "default",
    hoverPalette: "brand",
  },
];

const DEFAULT_PALETTES: Record<FontType, string[]> = {
  illustration: [],
  duo: ["#17181c", "#eefa94"],
  tri: ["#17181c", "#eefa94", "#ff6b9d"],
};

function NewFontModal({
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
  const [palette, setPalette] = useState<string[]>(
    DEFAULT_PALETTES.illustration,
  );

  function pickType(t: FontType) {
    setType(t);
    setPalette(DEFAULT_PALETTES[t]);
    setStep(2);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onCreate({ name, description: desc, font_type: type, palette });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ht-ink/30 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onCancel}
    >
      <div
        className="bg-ht-bg rounded-ht-xl p-10 max-w-4xl w-full shadow-ht-card"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 ? (
          <>
            {/* Close */}
            <div className="flex justify-end mb-2">
              <button
                onClick={onCancel}
                className="text-ht-ink/40 hover:text-ht-ink p-1 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chip + heading */}
            <div className="text-center mb-10">
              <span className="inline-flex items-center bg-ht-lime text-ht-ink font-semibold text-sm rounded-full px-5 py-2">
                New Type
              </span>
              <h2 className="mt-5 text-[28px] font-normal text-ht-ink leading-snug">
                Great things start with a spark of creativity
              </h2>
            </div>

            {/* Type cards */}
            <div className="grid grid-cols-3 gap-4">
              {TYPE_OPTIONS.map((o) => (
                <TypeCard key={o.type} option={o} onPick={pickType} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Step 2 header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-ht-ink">
                Project details
              </h2>
              <button
                onClick={onCancel}
                className="text-ht-ink/60 hover:text-ht-ink p-1"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 2 form */}
            <form onSubmit={submit} className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-ht-ink/60 hover:text-ht-ink inline-flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Change type
              </button>

              <input
                type="text"
                placeholder="Font name (e.g. Sunny Icons)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="ht-input"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="ht-input"
              />

              {(type === "duo" || type === "tri") && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-ht-ink/60 block mb-2">
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
                        <span className="text-[10px] text-ht-ink/60 font-mono">
                          Layer {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-ht-ink/60 mt-3 leading-relaxed">
                    Editable anytime — rebuild applies new colours to all glyphs.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="ht-btn-primary"
                >
                  {creating ? "Creating…" : "Create font"}{" "}
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-sm text-ht-ink/60 hover:text-ht-ink px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
