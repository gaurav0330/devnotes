/**
 * FormulaBar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The "Interactive Editor Panel" above the grid:
 *  • Shows selected cell coordinates
 *  • Text editor for text cells (with live sync + Ctrl+Enter save / Esc discard)
 *  • Toggle button for checkbox cells
 *  • Note selector for note cells
 *  • Unsaved / Saved indicator
 */

import React from "react";
import { Sparkles, Save, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

/* ── Checkbox editor ── */
const CheckboxEditor = ({ isChecked, onToggle }) => (
  <div className="flex items-center gap-4 py-1">
    <button
      onClick={onToggle}
      className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
        isChecked
          ? "border-green-500 bg-green-500/10 text-green-600"
          : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
      }`}
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          isChecked ? "bg-green-500 border-green-500" : "border-current"
        }`}
      >
        {isChecked && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {isChecked ? "Completed — Click to uncheck" : "Not completed — Click to check"}
    </button>
  </div>
);

/* ── Note editor ── */
const NoteEditor = ({ notes, currentNoteId, onSelect }) => {
  const linkedNote = notes.find((n) => n.id === currentNoteId);
  return (
    <div className="flex items-center gap-2 py-1">
      <select
        value={currentNoteId || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="flex-1 h-9 px-3 text-sm bg-background border border-border/50 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
      >
        <option value="">— not linked —</option>
        {notes.map((note) => (
          <option key={note.id} value={note.id}>
            {note.title}
          </option>
        ))}
      </select>
      {linkedNote && (
        <Link
          to={`/note/${linkedNote.slug}`}
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey) e.preventDefault();
          }}
          className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline font-medium px-2 py-1 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
          title="Ctrl+Click to open note"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </Link>
      )}
    </div>
  );
};

/* ── Text editor ── */
const TextEditor = ({
  value,
  onChange,
  onCommit,
  onDiscard,
  hasUnsaved,
}) => (
  <div className="flex flex-col gap-2">
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          onCommit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onDiscard();
        }
      }}
      placeholder="Enter cell value… (Ctrl+Enter to save, Esc to discard)"
      rows={2}
      className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 resize-none text-foreground placeholder:text-muted-foreground/40 font-mono leading-relaxed transition-all"
    />
    {hasUnsaved && (
      <div className="flex items-center gap-2">
        <button
          onClick={onCommit}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold transition-all"
        >
          <Save className="h-3 w-3" /> Save Changes
        </button>
        <button
          onClick={onDiscard}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border/50 rounded-lg text-muted-foreground hover:bg-muted/50 transition-all"
        >
          <X className="h-3 w-3" /> Discard
        </button>
        <span className="text-xs text-muted-foreground/50 ml-1">
          or press Ctrl+Enter / Esc
        </span>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * FormulaBar
 *
 * Props:
 *  selectedCell       {r, c} | null
 *  colType            "text" | "note" | "checkbox"
 *  headerLabel        string  — column name
 *  cellRow            row object | null
 *  notes              array
 *  formulaValue       string
 *  hasUnsaved         boolean
 *  onTextChange       (val) => void
 *  onTextCommit       () => void
 *  onTextDiscard      () => void
 *  onToggleCheckbox   () => void
 *  onLinkNote         (noteId) => void
 */
const FormulaBar = ({
  selectedCell,
  colType,
  headerLabel,
  cellRow,
  notes,
  formulaValue,
  hasUnsaved,
  onTextChange,
  onTextCommit,
  onTextDiscard,
  onToggleCheckbox,
  onLinkNote,
}) => {
  const isChecked = selectedCell
    ? !!(cellRow?.cells?.[selectedCell.c])
    : false;

  const currentNoteId = selectedCell
    ? (cellRow?.cells?.[selectedCell.c] || "")
    : "";

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        selectedCell
          ? "border-primary/30 bg-gradient-to-r from-primary/5 to-transparent shadow-sm"
          : "border-border/30 bg-muted/20"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border/20">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono shrink-0">
          {selectedCell
            ? `CELL R${selectedCell.r + 1}C${selectedCell.c + 1}`
            : "EDITOR"}
        </span>
        {selectedCell && (
          <span className="text-xs text-muted-foreground truncate flex-1">
            Editing: {headerLabel} (Row {selectedCell.r + 1})
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {hasUnsaved && (
            <span className="text-xs text-amber-500 font-medium animate-pulse">
              ● Unsaved
            </span>
          )}
          {selectedCell && !hasUnsaved && (
            <span className="text-xs text-green-500 font-medium">✓ Saved</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        {!selectedCell && (
          <p className="text-sm text-muted-foreground/50 italic py-1">
            Click any cell in the table to select it, then edit its value here
          </p>
        )}

        {selectedCell && colType === "checkbox" && (
          <CheckboxEditor isChecked={isChecked} onToggle={onToggleCheckbox} />
        )}

        {selectedCell && colType === "note" && (
          <NoteEditor
            notes={notes}
            currentNoteId={currentNoteId}
            onSelect={onLinkNote}
          />
        )}

        {selectedCell && colType !== "checkbox" && colType !== "note" && (
          <TextEditor
            value={formulaValue}
            onChange={onTextChange}
            onCommit={onTextCommit}
            onDiscard={onTextDiscard}
            hasUnsaved={hasUnsaved}
          />
        )}
      </div>
    </div>
  );
};

export default FormulaBar;