"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, Loader2, AlertCircle } from "lucide-react";
import { api, type Glyph, type FontType } from "@/lib/api";
import { validateSvgFile } from "@/lib/svg-validate";

const PUA_START = 0xe001;
const PUA_END = 0xf8ff;

type Props = {
  projectId: string;
  glyph: Glyph;
  /** All glyphs in the project (for uniqueness checks) */
  siblings: Glyph[];
  fontType: FontType;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export default function EditGlyphDialog({
  projectId,
  glyph,
  siblings,
  fontType,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(glyph.name);
  const [codepoint, setCodepoint] = useState(glyph.codepoint);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Build maps of sibling names/codepoints for instant uniqueness feedback
  const siblingNames = useMemo(
    () =>
      new Set(
        siblings.filter((g) => g.id !== glyph.id).map((g) => g.name.toLowerCase()),
      ),
    [siblings, glyph.id],
  );
  const siblingCodepoints = useMemo(
    () =>
      new Set(
        siblings
          .filter((g) => g.id !== glyph.id)
          .map((g) => g.codepoint.toUpperCase()),
      ),
    [siblings, glyph.id],
  );

  // Live validation messages
  const nameError = (() => {
    const trimmed = name.trim();
    if (!trimmed) return "Name is required.";
    if (trimmed.length > 64) return "Name must be 64 characters or fewer.";
    if (
      trimmed.toLowerCase() !== glyph.name.toLowerCase() &&
      siblingNames.has(trimmed.toLowerCase())
    ) {
      return "Another glyph in this project already uses this name.";
    }
    return null;
  })();

  const codepointError = (() => {
    const raw = codepoint.trim().replace(/^u\+/i, "");
    if (!raw) return "Codepoint is required.";
    if (!/^[0-9a-fA-F]+$/.test(raw)) return "Codepoint must be hex (e.g. E001).";
    const cp = parseInt(raw, 16);
    if (cp < PUA_START || cp > PUA_END) {
      return "Codepoint must be in the private use area (E001–F8FF).";
    }
    const canonical = raw.toUpperCase().padStart(4, "0");
    if (
      canonical !== glyph.codepoint.toUpperCase() &&
      siblingCodepoints.has(canonical)
    ) {
      return "Another glyph in this project uses this codepoint.";
    }
    return null;
  })();

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function handlePickFile(f: File) {
    setFileError(null);
    const result = await validateSvgFile(f, fontType);
    if (!result.ok) {
      setFileError(result.error);
      setPendingFile(null);
      return;
    }
    setPendingFile(f);
  }

  const nameChanged = name.trim() !== glyph.name;
  const codepointChanged =
    codepoint.trim().toUpperCase().replace(/^U\+/, "").padStart(4, "0") !==
    glyph.codepoint.toUpperCase();
  const dirty = nameChanged || codepointChanged || !!pendingFile;

  const canSave =
    dirty && !nameError && !codepointError && !fileError && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setServerError(null);
    try {
      // 1. Replace SVG first (this revalidates server-side too)
      if (pendingFile) {
        await api.replaceGlyphSvg(projectId, glyph.id, pendingFile);
      }
      // 2. Update name/codepoint
      if (nameChanged || codepointChanged) {
        const body: { name?: string; codepoint?: string } = {};
        if (nameChanged) body.name = name.trim();
        if (codepointChanged) {
          body.codepoint = codepoint
            .trim()
            .toUpperCase()
            .replace(/^U\+/, "");
        }
        await api.updateGlyph(projectId, glyph.id, body);
      }

      // 3. Auto-trigger a rebuild so the preview matches the changes.
      //    Don't let a build-trigger error block the close — the user can
      //    rebuild manually if it fails.
      try {
        await api.createJob(projectId);
      } catch (buildErr) {
        console.warn("Auto-rebuild failed, user can retry manually:", buildErr);
      }

      await onSaved();
      onClose();
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="card w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-3 right-3 text-text-secondary hover:text-text-primary p-1"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h2 className="text-base font-semibold mb-1">Edit glyph</h2>
        <p className="text-xs text-text-muted mb-5">
          Rename, change the codepoint, or replace the SVG. The font will
          rebuild automatically after saving.
        </p>

        {/* Name */}
        <label className="block mb-4">
          <span className="block text-xs text-text-secondary mb-1.5">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. heart"
            disabled={saving}
          />
          {nameError && (
            <p className="text-[11px] text-red-400 mt-1 flex items-start gap-1">
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              {nameError}
            </p>
          )}
        </label>

        {/* Codepoint */}
        <label className="block mb-4">
          <span className="block text-xs text-text-secondary mb-1.5">
            Codepoint <span className="text-text-muted">(hex, E001–F8FF)</span>
          </span>
          <input
            type="text"
            value={codepoint}
            onChange={(e) => setCodepoint(e.target.value)}
            className="input font-mono uppercase"
            placeholder="E001"
            disabled={saving}
          />
          {codepointError && (
            <p className="text-[11px] text-red-400 mt-1 flex items-start gap-1">
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              {codepointError}
            </p>
          )}
        </label>

        {/* Replace SVG */}
        <div className="mb-5">
          <span className="block text-xs text-text-secondary mb-1.5">
            Replace SVG (optional)
          </span>
          <input
            ref={fileInput}
            type="file"
            accept=".svg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePickFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={saving}
            className="w-full bg-bg-hover border border-border rounded-lg p-3 text-left text-sm hover:border-border-strong flex items-center gap-3 transition-colors"
          >
            <Upload size={14} className="text-text-muted shrink-0" />
            <span className="truncate flex-1">
              {pendingFile ? pendingFile.name : "Choose a new SVG file"}
            </span>
            {pendingFile && (
              <span className="text-[10px] text-green-400 shrink-0">ready</span>
            )}
          </button>
          {fileError && (
            <p className="text-[11px] text-red-400 mt-1 flex items-start gap-1">
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              {fileError}
            </p>
          )}
        </div>

        {serverError && (
          <p className="text-[11px] text-red-400 mb-3 flex items-start gap-1">
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="btn-primary min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : (
              "Save & rebuild"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
