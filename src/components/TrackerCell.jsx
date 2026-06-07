/**
 * TrackerCell.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a single data cell in the tracker grid.
 * Handles three column types: text, note (linked), checkbox.
 */

import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/** Splits text with URLs into clickable link spans. */
const RichText = ({ val, rIdx, c, onSelect }) => {
  if (!val) {
    return (
      <span className="text-muted-foreground/30 italic text-xs">—</span>
    );
  }
  const parts = String(val).split(URL_REGEX);
  if (parts.length === 1) return <>{val}</>;

  return (
    <>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onSelect({ r: rIdx, c });
                }
              }}
              className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
              title="Ctrl+Click to open URL"
            >
              {part}
              <ExternalLink className="h-3 w-3 inline-block shrink-0" />
            </a>
          );
        }
        return part;
      })}
    </>
  );
};

/** Checkbox cell */
const CheckboxCell = ({ val, width, isSelected, onSelect, onToggle, row, c }) => (
  <td
    className={[
      "relative border-r border-b border-border/20 overflow-hidden text-center cursor-pointer select-none",
      isSelected ? "ring-2 ring-inset ring-primary bg-primary/5 z-10" : "hover:bg-muted/10",
    ].join(" ")}
    style={{ width, minWidth: width, maxWidth: width }}
    onClick={() => {
      onSelect();
      onToggle(row.id, c);
    }}
    title={val ? "Completed (Click to toggle)" : "Not Completed (Click to toggle)"}
  >
    <div className="flex items-center justify-center h-full py-2">
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          val
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border/60 hover:border-primary/60"
        }`}
      >
        {val && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  </td>
);

/** Note (linked) cell */
const NoteCell = ({ val, width, isSelected, isEditing, row, c, notes, onSelect, onStartEdit, onLink }) => {
  const linkedNote = notes.find((n) => n.id === val);

  if (isEditing) {
    return (
      <td
        className="relative border-r border-b border-border/20 overflow-hidden p-0"
        style={{ width, minWidth: width, maxWidth: width }}
      >
        <select
          autoFocus
          value={val || ""}
          onChange={(e) => {
            onLink(row.id, e.target.value, c);
          }}
          onBlur={() => onStartEdit(null)}
          className="w-full h-full px-3 py-2 text-sm bg-background border-0 outline-none focus:ring-0 cursor-pointer"
        >
          <option value="">🔗 — not linked —</option>
          {notes.map((note) => (
            <option key={note.id} value={note.id}>
              {note.title}
            </option>
          ))}
        </select>
      </td>
    );
  }

  return (
    <td
      className={[
        "relative border-r border-b border-border/20 overflow-hidden cursor-pointer",
        isSelected ? "ring-2 ring-inset ring-primary bg-primary/5 z-10" : "hover:bg-muted/10",
      ].join(" ")}
      style={{ width, minWidth: width, maxWidth: width }}
      onClick={onSelect}
      onDoubleClick={() => onStartEdit({ r: -1, c })} // signal to parent
      title={linkedNote ? `Linked: ${linkedNote.title} (Ctrl+Click to open)` : "Double-click to link a note"}
    >
      <div className="px-3 py-2 h-full flex items-center gap-2 overflow-hidden">
        {linkedNote ? (
          <>
            <Link
              to={`/note/${linkedNote.slug}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!e.ctrlKey && !e.metaKey) e.preventDefault();
              }}
              className="text-xs font-semibold text-primary hover:underline truncate flex-1"
              title="Ctrl+Click to open note"
            >
              📄 {linkedNote.title}
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLink(row.id, null, c);
              }}
              className="text-muted-foreground hover:text-destructive text-[11px] shrink-0 px-1 rounded"
            >
              ✕
            </button>
          </>
        ) : (
          <span className="text-muted-foreground/40 text-xs italic">
            double-click to link
          </span>
        )}
      </div>
    </td>
  );
};

/** Text cell */
const TextCell = ({ val, width, isSelected, isEditing, rIdx, c, inputRef, editValue, onEditChange, onCommit, onSelect, onStartEdit, onMoveSel, onCancelEdit, onSetSelected }) => {
  if (isEditing) {
    return (
      <td
        className="relative border-r border-b border-border/20 overflow-hidden p-0"
        style={{ width, minWidth: width, maxWidth: width }}
      >
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={() => onCommit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommit();
              onMoveSel(1, 0);
            } else if (e.key === "Tab") {
              e.preventDefault();
              onCommit();
              onMoveSel(0, e.shiftKey ? -1 : 1);
            } else if (e.key === "Escape") {
              onCancelEdit();
            }
          }}
          className="w-full h-full px-3 py-2 text-sm bg-background border-0 outline-none focus:ring-0 text-foreground"
          style={{ minHeight: "36px" }}
        />
      </td>
    );
  }

  const displayVal = typeof val === "boolean" ? "" : (val ?? "");
  return (
    <td
      className={[
        "relative border-r border-b border-border/20 overflow-hidden cursor-default",
        isSelected ? "ring-2 ring-inset ring-primary bg-primary/5 z-10" : "hover:bg-muted/10",
      ].join(" ")}
      style={{ width, minWidth: width, maxWidth: width }}
      onClick={() => onSelect()}
      onDoubleClick={() => onStartEdit(rIdx, c)}
      title={displayVal ? String(displayVal) : "Empty — double-click to edit"}
    >
      <div
        className="px-3 py-2 text-sm text-foreground overflow-hidden whitespace-nowrap overflow-ellipsis h-full flex items-center"
        style={{ minHeight: "36px" }}
      >
        <RichText val={displayVal} rIdx={rIdx} c={c} onSelect={onSetSelected} />
      </div>
    </td>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * TrackerCell — dispatches to the correct cell type renderer.
 *
 * Props:
 *  row, rIdx, c           — cell identity
 *  colType                — "text" | "note" | "checkbox"
 *  width                  — pixel width
 *  isSelected, isEditing  — selection / editing state
 *  notes                  — array of note objects
 *  editValue              — current edit text (text cells)
 *  inputRef               — ref forwarded to input (text cells)
 *  onSelect               — () => void
 *  onSetSelected          — (cell) => void  (for URL clicks)
 *  onStartEdit            — (r, c, initial?) => void
 *  onCancelEdit           — () => void
 *  onCommit               — (val?) => void
 *  onEditChange           — (val) => void
 *  onToggle               — (rowId, colIdx) => void   (checkbox)
 *  onLink                 — (rowId, noteId, c) => void (note)
 *  onMoveSel              — (dr, dc) => void
 */
const TrackerCell = (props) => {
  const {
    row, rIdx, c, colType, width,
    isSelected, isEditing,
    notes, editValue, inputRef,
    onSelect, onSetSelected, onStartEdit, onCancelEdit,
    onCommit, onEditChange, onToggle, onLink, onMoveSel,
  } = props;

  const val = row.cells[c];

  if (colType === "checkbox") {
    return (
      <CheckboxCell
        val={val}
        width={width}
        isSelected={isSelected}
        onSelect={() => onSelect()}
        onToggle={onToggle}
        row={row}
        c={c}
      />
    );
  }

  if (colType === "note") {
    return (
      <NoteCell
        val={val}
        width={width}
        isSelected={isSelected}
        isEditing={isEditing}
        row={row}
        c={c}
        notes={notes}
        onSelect={() => onSelect()}
        onStartEdit={onStartEdit}
        onLink={onLink}
      />
    );
  }

  return (
    <TextCell
      val={val}
      width={width}
      isSelected={isSelected}
      isEditing={isEditing}
      rIdx={rIdx}
      c={c}
      inputRef={inputRef}
      editValue={editValue}
      onEditChange={onEditChange}
      onCommit={onCommit}
      onSelect={() => onSelect()}
      onStartEdit={onStartEdit}
      onMoveSel={onMoveSel}
      onCancelEdit={onCancelEdit}
      onSetSelected={onSetSelected}
    />
  );
};

export default TrackerCell;