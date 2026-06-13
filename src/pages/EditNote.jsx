/**
 * EditNote.jsx — improved note editing page.
 *
 * Changes vs original:
 *  - Autosave (debounced, 2 s after last keystroke) with visual indicator
 *  - ⌘S / Ctrl+S keyboard shortcut for manual save
 *  - React Router navigation guard (dirty-state prompt on in-app navigation)
 *  - Replaced alert() with inline error banner
 *  - Encapsulated field updater (patch()) — no more scattered { ...note, x }
 *  - Loading skeleton instead of null flash
 *  - Unsaved-changes dot on Save button
 *  - Consistent select styling via a shared SelectField wrapper
 *  - Removed redundant visibility footer
 *  - Tags rendered as removable chips with an add-on-Enter flow
 *  - Cleaner header with last-saved timestamp
 */

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPrivateNoteBySlug,
  updateNote,
  getUserFolders,
} from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/context/DialogContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Save, ArrowLeft, Tag, Folder, Globe, Lock,
  X, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

function formatSavedAt(date) {
  if (!date) return null;
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 5)  return "Saved just now";
  if (diff < 60) return `Saved ${Math.floor(diff)}s ago`;
  return `Saved at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Consistent <select> wrapper that matches Input height/style */
function SelectField({ icon: Icon, value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      )}
      <select
        value={value}
        onChange={onChange}
        className={[
          "h-10 w-full appearance-none rounded-md border border-input",
          "bg-background text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
          "transition-colors cursor-pointer",
          Icon ? "pl-9 pr-8" : "px-3",
        ].join(" ")}
      >
        {children}
      </select>
      {/* chevron */}
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
      >
        <path fillRule="evenodd" clipRule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        />
      </svg>
    </div>
  );
}

/** Tag chip list with keyboard-driven add */
function TagEditor({ tags, onChange }) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || tags.includes(trimmed)) { setInput(""); return; }
    onChange([...tags, trimmed]);
    setInput("");
  };

  const remove = (tag) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-10 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring transition-all">
      <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => remove(tag)}
            className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !input && tags.length) remove(tags[tags.length - 1]);
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

/** Inline error banner */
function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        aria-label="Dismiss error"
        onClick={onDismiss}
        className="rounded p-0.5 hover:bg-destructive/20 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Loading skeleton */
function EditSkeleton() {
  const bar = (w, h = "h-4") => (
    <div className={`${h} ${w} rounded-md bg-muted animate-pulse`} />
  );
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">{bar("w-20", "h-9")}{bar("w-32", "h-8")}</div>
      {bar("w-full", "h-14")}
      <div className="flex gap-3">{bar("w-64", "h-10")}{bar("w-44", "h-10")}{bar("w-36", "h-10")}{bar("w-24", "h-10")}</div>
      {bar("w-full", "h-[420px]")}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditNote() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showConfirm } = useDialog();

  const queryClient = useQueryClient();

  const { data: noteInitial = null, isLoading: noteLoading } = useQuery({
    queryKey: ["note", slug, user?.uid],
    queryFn: () => getPrivateNoteBySlug(user.uid, slug),
    enabled: !!user && !!slug,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["folders", user?.uid],
    queryFn: () => getUserFolders(user.uid),
    enabled: !!user,
  });

  const [note,    setNote]    = useState(null);
  const [tags,    setTags]    = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [dirty,   setDirty]   = useState(false);
  const [error,   setError]   = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  // Sync initial note load with editable local state
  useEffect(() => {
    if (noteInitial) {
      setNote(noteInitial);
      setTags(noteInitial.tags ?? []);
    }
  }, [noteInitial]);

  // Redirect if note not found after loading
  useEffect(() => {
    if (!noteLoading && noteInitial === null) {
      navigate("/");
    }
  }, [noteLoading, noteInitial, navigate]);

  /** Immutable field updater — replaces scattered { ...note, x } calls */
  const patch = useCallback((fields) => {
    setNote((prev) => prev ? { ...prev, ...fields } : prev);
    setDirty(true);
    setError(null);
  }, []);

  // ── Browser tab close guard ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ── In-app navigation guard (compatible with <BrowserRouter>) ─────────────
  // useBlocker requires a data router, so we wrap navigate() instead.
  const safeNavigate = useCallback(async (to) => {
    if (dirty) {
      const ok = await showConfirm({
        title: "Unsaved Changes",
        message: "You have unsaved changes. Leave anyway?",
        type: "warning"
      });
      if (!ok) return;
    }
    navigate(to);
  }, [dirty, navigate, showConfirm]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!note || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateNote({
        userId:     user.uid,
        noteId:     note.id,
        title:      note.title,
        content:    note.content,
        tags,
        visibility: note.visibility,
        folderId:   note.folderId ?? null,
      });
      setDirty(false);
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["note", slug, user.uid] });
      queryClient.invalidateQueries({ queryKey: ["notes", user.uid] });
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [note, tags, user, saving]);

  // ── Autosave (2 s debounce) ────────────────────────────────────────────────
  const debouncedSave = useDebounce(save, 2000);
  useEffect(() => {
    if (dirty) debouncedSave();
  }, [dirty, note, tags, debouncedSave]);

  // ── ⌘S / Ctrl+S shortcut ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [save]);

  // ── Saved-at ticker (updates label every 15 s) ────────────────────────────
  useEffect(() => {
    if (!savedAt) return;
    const id = setInterval(() => setSavedAt((d) => d ? new Date(d) : d), 15_000);
    return () => clearInterval(id);
  }, [savedAt]);

  if (!note) return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <EditSkeleton />
    </div>
  );

  const savedLabel = formatSavedAt(savedAt);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => safeNavigate(`/note/${slug}`)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>

          <h1 className="text-2xl font-semibold text-foreground">Edit note</h1>

          {/* Save status */}
          <div className="ml-auto flex items-center gap-2">
            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            )}
            {!saving && savedLabel && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {savedLabel}
              </span>
            )}
            {!saving && dirty && !savedLabel && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
          </div>
        </div>

        {/* ── Error banner ────────────────────────────────────────────────── */}
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* ── Title ───────────────────────────────────────────────────────── */}
        <Input
          value={note.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="text-xl font-semibold h-12"
          placeholder="Note title"
          aria-label="Note title"
        />

        {/* ── Meta row ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2.5 items-start">

          {/* Tags chip editor */}
          <div className="flex-1 min-w-[220px]">
            <TagEditor tags={tags} onChange={(t) => { setTags(t); setDirty(true); }} />
          </div>

          {/* Folder */}
          <SelectField
            icon={Folder}
            value={note.folderId || ""}
            onChange={(e) => patch({ folderId: e.target.value || null })}
            className="min-w-[180px]"
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </SelectField>

          {/* Visibility */}
          <SelectField
            icon={note.visibility === "public" ? Globe : Lock}
            value={note.visibility}
            onChange={(e) => patch({ visibility: e.target.value })}
            className="min-w-[140px]"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </SelectField>

          {/* Save button */}
          <Button
            onClick={save}
            disabled={saving || !dirty}
            className="shrink-0 relative"
            aria-label={saving ? "Saving…" : "Save note (⌘S)"}
          >
            {saving
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Save className="h-4 w-4 mr-2" />
            }
            {saving ? "Saving…" : "Save"}
            {/* Unsaved dot */}
            {dirty && !saving && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-background"
              />
            )}
          </Button>
        </div>

        {/* ── Editor ──────────────────────────────────────────────────────── */}
        <RichTextEditor
          value={note.content}
          onChange={(content) => patch({ content })}
          placeholder="Start writing your note…"
        />

      </div>
    </div>
  );
}