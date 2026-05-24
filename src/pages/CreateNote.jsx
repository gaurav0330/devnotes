/**
 * CreateNote.jsx
 *
 * Improvements over original:
 *  - Draft restore via inline banner instead of window.confirm() on mount
 *  - Inline field-level validation (no alert())
 *  - TagEditor chips (consistent with EditNote)
 *  - SelectField wrapper (consistent with EditNote)
 *  - ⌘S / Ctrl+S shortcut to save
 *  - beforeunload guard when draft exists
 *  - Focus mode properly hides/shows header (no invisible-but-accessible DOM)
 *  - Loader2 spinner instead of custom .spinner class
 *  - stripHtml moved to module scope
 *  - Word/char count moved to footer only (not duplicated from RichTextEditor)
 *  - Draft stores tags as string[] not comma-string
 *  - Removed redundant visibility emoji footer
 *  - ErrorBanner for save failures
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createNote } from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Save, Tag, Maximize2, Minimize2,
  Globe, Lock, Trash2, Loader2,
  RotateCcw, X, AlertCircle, CheckCircle2,
} from "lucide-react";

// ─── Module-level helpers ─────────────────────────────────────────────────────

const DRAFT_KEY = "note_draft_v2"; // versioned key so old malformed drafts don't break

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || "";
}

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    // Only restore if there's actual content worth restoring
    if (!d.title && !stripHtml(d.content)) return null;
    return d;
  } catch {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

// ─── Shared sub-components (same as EditNote for consistency) ─────────────────

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
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "transition-colors cursor-pointer",
          Icon ? "pl-9 pr-8" : "px-3",
        ].join(" ")}
      >
        {children}
      </select>
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

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className="rounded p-0.5 hover:bg-destructive/20 transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Non-blocking draft restore banner */
function DraftBanner({ draft, onRestore, onDiscard }) {
  if (!draft) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
      <RotateCcw className="h-4 w-4 shrink-0" />
      <span className="flex-1">You have an unsaved draft. Restore it?</span>
      <button
        type="button"
        onClick={onRestore}
        className="rounded px-2.5 py-1 text-xs font-medium bg-amber-400/20 hover:bg-amber-400/30 transition-colors"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="rounded p-0.5 hover:bg-amber-400/20 transition-colors"
        aria-label="Discard draft"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateNote() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title,      setTitle]      = useState("");
  const [content,    setContent]    = useState("");
  const [tags,       setTags]       = useState([]);
  const [visibility, setVisibility] = useState("private");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);
  const [titleError, setTitleError] = useState(false);
  const [isFocusMode, setFocusMode] = useState(false);

  const [pendingDraft, setPendingDraft] = useState(() => readDraft());
  const hasDraft = !!pendingDraft;

  const hasContent = title || content || tags.length > 0;

  // ── Draft autosave (2 s debounce) ─────────────────────────────────────────
  const writeDraft = useDebounce(() => {
    if (!hasContent) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content, tags, visibility }));
  }, 2000);

  useEffect(() => {
    // Don't autosave while a pending draft banner is shown — wait for user decision
    if (pendingDraft) return;
    writeDraft();
  }, [title, content, tags, visibility, pendingDraft, writeDraft]);

  // ── beforeunload guard ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!hasContent) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasContent]);

  // ── Draft banner actions ───────────────────────────────────────────────────
  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    setTitle(pendingDraft.title ?? "");
    setContent(pendingDraft.content ?? "");
    setTags(Array.isArray(pendingDraft.tags) ? pendingDraft.tags : []);
    setVisibility(pendingDraft.visibility ?? "private");
    setPendingDraft(null);
  }, [pendingDraft]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setPendingDraft(null);
  }, []);

  // ── Clear all ─────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    if (!hasContent) return;
    if (!window.confirm("Clear all fields and discard draft?")) return;
    setTitle(""); setContent(""); setTags([]); setVisibility("private");
    clearDraft();
  }, [hasContent]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saving) return;

    // Validation
    if (!title.trim()) {
      setTitleError(true);
      document.getElementById("note-title")?.focus();
      return;
    }
    if (!stripHtml(content).trim()) {
      setError("Please add some content before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const slug = await createNote({
        title: title.trim(),
        content,
        tags,
        userId: user.uid,
        visibility,
      });
      clearDraft();
      navigate(`/note/${slug}`);
    } catch (err) {
      console.error(err);
      setError("Failed to create note. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [saving, title, content, tags, visibility, user, navigate]);

  // ── ⌘S / Ctrl+S ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSave]);

  // ── Word / char count ─────────────────────────────────────────────────────
  const { wordCount, charCount } = useMemo(() => {
    const text = stripHtml(content);
    return {
      wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
      charCount: text.length,
    };
  }, [content]);

  const plural = (n, word) => `${n.toLocaleString()} ${word}${n !== 1 ? "s" : ""}`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-5">

        {/* ── Draft restore banner ─────────────────────────────────────────── */}
        <DraftBanner draft={pendingDraft} onRestore={restoreDraft} onDiscard={discardDraft} />

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* ── Header (hidden in focus mode, but properly removed from DOM) ─── */}
        {!isFocusMode && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">New note</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={!hasContent}
                className="text-muted-foreground hover:text-destructive disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Clear
              </Button>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Input
                id="note-title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                placeholder="Untitled note"
                aria-label="Note title"
                aria-invalid={titleError}
                className={[
                  "text-2xl font-semibold h-12",
                  titleError ? "border-destructive focus-visible:ring-destructive" : "",
                ].join(" ")}
              />
              {titleError && (
                <p role="alert" className="text-xs text-destructive px-1">
                  Please enter a title before saving.
                </p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-2.5 items-start">
              <div className="flex-1 min-w-[200px]">
                <TagEditor tags={tags} onChange={setTags} />
              </div>

              <SelectField
                icon={visibility === "public" ? Globe : Lock}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="min-w-[140px]"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </SelectField>

              <Button
                onClick={handleSave}
                disabled={saving}
                aria-label={saving ? "Saving…" : "Save note (⌘S)"}
                className="shrink-0"
              >
                {saving
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Save className="h-4 w-4 mr-2" />
                }
                {saving ? "Saving…" : "Save note"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Focus mode toggle bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground/50 uppercase tracking-widest font-semibold select-none">
            {plural(wordCount, "word")}
            <span className="opacity-40">·</span>
            {plural(charCount, "character")}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFocusMode((v) => !v)}
            className={`gap-2 rounded-full transition-colors ${
              isFocusMode ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            {isFocusMode
              ? <><Minimize2 className="h-4 w-4" /> Exit focus</>
              : <><Maximize2 className="h-4 w-4" /> Focus mode</>
            }
          </Button>
        </div>

        {/* ── Editor ───────────────────────────────────────────────────────── */}
        <div className={isFocusMode ? "max-w-2xl mx-auto pt-6" : ""}>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your note…"
            minHeight={isFocusMode ? 600 : 500}
            autofocus={isFocusMode}
          />
        </div>

        {/* Focus mode inline save ─ only shown when header is hidden */}
        {isFocusMode && (
          <div className="max-w-2xl mx-auto flex items-center justify-between text-xs text-muted-foreground/50">
            <span className="uppercase tracking-widest font-semibold select-none">
              {plural(wordCount, "word")}
            </span>
            <Button size="sm" onClick={handleSave} disabled={saving} variant="ghost" className="gap-1.5">
              {saving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Save className="h-3.5 w-3.5" />
              }
              {saving ? "Saving…" : "Save (⌘S)"}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}