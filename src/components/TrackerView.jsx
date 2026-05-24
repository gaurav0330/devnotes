import React, { useState, useCallback, useMemo, useRef } from "react";
import { 
  Plus, 
  Trash, 
  Trash2,
  Table,
  Sparkles,
  Search, 
  Settings,
  Link as LinkIcon,
  CheckSquare,
  Type,
  ExternalLink,
  Save,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { HeaderThCell } from "./HeaderThCell";
import { Button } from "@/components/ui/button";

const normalizeRow = (row, numHeaders) => {
  let cells = row.cells || [];
  if (cells.length === 0) {
    cells = [
      row.title || "",
      row.noteId || "",
      row.completed || false
    ];
  }
  const padded = [...cells];
  while (padded.length < numHeaders) {
    padded.push("");
  }
  if (padded.length > numHeaders) {
    padded.splice(numHeaders);
  }
  return {
    id: row.id,
    cells: padded
  };
};

const COL_DEFAULTS = { 0: 300, 1: 250, 2: 120 };
const COL_MIN = 60;

const TrackerView = ({ tracker, notes, onUpdate, onDelete }) => {
  const [headers, setHeaders] = useState(
    () => tracker?.headers || ["Task Title", "Linked Note", "Completed"]
  );
  const [rows, setRows] = useState(() => (tracker?.rows || []).map((r) => normalizeRow(r, (tracker?.headers || ["Task Title", "Linked Note", "Completed"]).length)));
  const [colWidths, setColWidths] = useState(() => tracker?.colWidths || {});
  const [columnTypes, setColumnTypes] = useState(
    () => tracker?.columnTypes || { 0: "text", 1: "note", 2: "checkbox" }
  );

  const getColType = useCallback((c) => {
    return columnTypes[c] || (c === 2 ? "checkbox" : c === 1 ? "note" : "text");
  }, [columnTypes]);

  const updateColType = useCallback((cIdx, newType) => {
    const updatedTypes = { ...columnTypes, [cIdx]: newType };
    setColumnTypes(updatedTypes);
    
    // Also normalize existing rows for the new type
    const numCols = headers.length;
    const updatedRows = rows.map(r => {
      const norm = normalizeRow(r, numCols);
      const cells = [...norm.cells];
      if (newType === "checkbox") {
        cells[cIdx] = !!cells[cIdx];
      } else {
        cells[cIdx] = typeof cells[cIdx] === "boolean" ? "" : String(cells[cIdx] ?? "");
      }
      return { ...norm, cells };
    });
    setRows(updatedRows);
    onUpdate(tracker.id, { columnTypes: updatedTypes, rows: updatedRows });
  }, [columnTypes, rows, headers.length, tracker.id, onUpdate]);

  /* â”€â”€ selection / editing state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [selectedCell, setSelectedCell] = useState(null); // {r, c}
  const [editingCell, setEditingCell]   = useState(null); // {r, c}
  const [editValue, setEditValue]       = useState("");
  const [trackerSearch, setTrackerSearch] = useState("");
  const [formulaEditValue, setFormulaEditValue] = useState("");
  const [hasUnsavedFormulaEdit, setHasUnsavedFormulaEdit] = useState(false);


  const inputRef   = useRef(null);
  const gridRef    = useRef(null);
  const resizeRef  = useRef(null); // {colIdx, startX, startW}

  /* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const numCols = headers.length;
  const normalRows = useMemo(() => rows.map(r => normalizeRow(r, numCols)), [rows, numCols]);

  const filteredRows = useMemo(() => {
    if (!trackerSearch.trim()) return normalRows;
    const q = trackerSearch.toLowerCase();
    return normalRows.filter(r => r.cells.some(c => String(c).toLowerCase().includes(q)));
  }, [normalRows, trackerSearch]);

  const getWidth = (c) => colWidths[c] ?? COL_DEFAULTS[c] ?? 160;
  const primaryCheckboxCol = headers.findIndex((_, idx) => getColType(idx) === "checkbox");

  const toggleCompleted = useCallback((rowId, colIdx) => {
    const updatedRows = rows.map(row => {
      if (row.id !== rowId) return row;
      const norm = normalizeRow(row, numCols);
      const cells = [...norm.cells];
      const c = colIdx ?? 2; cells[c] = !cells[c];
      return { ...norm, cells };
    });
    setRows(updatedRows);
    onUpdate(tracker.id, { rows: updatedRows });
  }, [rows, numCols, tracker.id, onUpdate]);

  const linkNote = useCallback((rowId, noteId, colIdx) => {
    const updatedRows = rows.map(row => {
      if (row.id !== rowId) return row;
      const norm = normalizeRow(row, numCols);
      const cells = [...norm.cells];
      const c = colIdx ?? 1; cells[c] = noteId || "";
      return { ...norm, cells };
    });
    setRows(updatedRows);
    onUpdate(tracker.id, { rows: updatedRows });
  }, [rows, numCols, tracker.id, onUpdate]);

  const toggleAllCompleted = useCallback((colIdx) => {
    const c = colIdx ?? 2; const allDone = normalRows.every(r => !!r.cells[c]);
    const updatedRows = rows.map(row => {
      const norm = normalizeRow(row, numCols);
      const cells = [...norm.cells];
      cells[c] = !allDone;
      return { ...norm, cells };
    });
    setRows(updatedRows);
    onUpdate(tracker.id, { rows: updatedRows });
  }, [normalRows, rows, numCols, tracker.id, onUpdate]);

  /* ── commit edit ─────────────────────────────────── */
  const commitEdit = useCallback((newVal) => {
    if (!editingCell) return;
    const { r, c } = editingCell;
    const targetId = filteredRows[r]?.id;
    if (!targetId) return;

    const updatedRows = rows.map(row => {
      if (row.id !== targetId) return row;
      const norm = normalizeRow(row, numCols);
      const cells = [...norm.cells];
      cells[c] = getColType(c) === "checkbox" ? cells[c] : (newVal ?? editValue);
      return { ...norm, cells };
    });

    setRows(updatedRows);
    setEditingCell(null);
    onUpdate(tracker.id, { rows: updatedRows });
  }, [editingCell, editValue, filteredRows, rows, numCols, tracker.id, onUpdate, getColType]);

  /* ── start editing ─────────────────────────────────── */
  const startEdit = useCallback((r, c, initialVal = null) => {
    if (getColType(c) === "checkbox") return;
    setEditingCell({ r, c });
    const cellVal = filteredRows[r]?.cells[c] ?? "";
    setEditValue(initialVal !== null ? initialVal : (typeof cellVal === "boolean" ? "" : String(cellVal)));
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [filteredRows, getColType]);

  /* ── formula bar text ──────────────────────────────── */

  const toggleCompletedFromFormula = useCallback(() => {
    if (!selectedCell) return;
    const { r } = selectedCell;
    const targetId = filteredRows[r]?.id;
    if (!targetId) return;
    toggleCompleted(targetId, selectedCell.c);
  }, [selectedCell, filteredRows, toggleCompleted]);

  const linkNoteFromFormula = useCallback((noteId) => {
    if (!selectedCell) return;
    const { r } = selectedCell;
    const targetId = filteredRows[r]?.id;
    if (!targetId) return;
    linkNote(targetId, noteId, selectedCell.c);
  }, [selectedCell, filteredRows, linkNote]);

  const handleFormulaTextareaChange = useCallback((val) => {
    setFormulaEditValue(val);
    setHasUnsavedFormulaEdit(true);

    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const targetId = filteredRows[r]?.id;
    if (!targetId) return;

    setRows(prevRows => 
      prevRows.map(row => {
        if (row.id !== targetId) return row;
        const norm = normalizeRow(row, numCols);
        const cells = [...norm.cells];
        cells[c] = val;
        return { ...norm, cells };
      })
    );
  }, [selectedCell, filteredRows, numCols]);

  const commitFormulaEdit = useCallback(() => {
    if (!selectedCell || !hasUnsavedFormulaEdit) return;
    onUpdate(tracker.id, { rows });
    setHasUnsavedFormulaEdit(false);
  }, [selectedCell, hasUnsavedFormulaEdit, rows, tracker.id, onUpdate]);

  const resetFormulaEdit = useCallback(() => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const targetId = filteredRows[r]?.id;
    if (!targetId) return;

    const dbRow = tracker.rows?.find(row => row.id === targetId);
    const dbNorm = dbRow ? normalizeRow(dbRow, numCols) : null;
    const origVal = dbNorm ? dbNorm.cells[c] : "";

    setFormulaEditValue(typeof origVal === "boolean" ? "" : (origVal ?? ""));
    setHasUnsavedFormulaEdit(false);

    setRows(prevRows => 
      prevRows.map(row => {
        if (row.id !== targetId) return row;
        const norm = normalizeRow(row, numCols);
        const cells = [...norm.cells];
        cells[c] = origVal;
        return { ...norm, cells };
      })
    );
  }, [selectedCell, filteredRows, numCols, tracker.rows]);

  const renderCellContent = useCallback((val, rIdx, c) => {
    const displayVal = typeof val === "boolean" ? "" : (val ?? "");
    if (!displayVal) {
      return <span className="text-muted-foreground/30 italic text-xs">—</span>;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = String(displayVal).split(urlRegex);
    if (parts.length === 1) {
      return displayVal;
    }

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
      
  return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setSelectedCell({ r: rIdx, c });
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
    });
  }, [setSelectedCell]);

  if (!tracker) return null;

  /* â”€â”€ keyboard navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleGridKeyDown = (e) => {
    if (editingCell) {
      if (e.key === "Escape") { setEditingCell(null); return; }
      if (e.key === "Enter") { commitEdit(); moveSel(1, 0); return; }
      if (e.key === "Tab") { e.preventDefault(); commitEdit(); moveSel(0, e.shiftKey ? -1 : 1); return; }
      return; // let the input handle the rest
    }

    if (!selectedCell) return;
    const { r, c } = selectedCell;

    if (e.key === "F2" || e.key === "Enter") { e.preventDefault(); startEdit(r, c); return; }
    if (e.key === "Delete" || e.key === "Backspace") { startEdit(r, c, ""); return; }
    if (e.key === "Tab") { e.preventDefault(); moveSel(0, e.shiftKey ? -1 : 1); return; }
    if (e.key === "ArrowUp")    { e.preventDefault(); moveSel(-1, 0); return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); moveSel(1, 0);  return; }
    if (e.key === "ArrowLeft")  { e.preventDefault(); moveSel(0, -1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); moveSel(0, 1);  return; }
    // Printable key â†’ start editing
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { startEdit(r, c, e.key); return; }
  };

  const moveSel = (dr, dc) => {
    setSelectedCell(prev => {
      if (!prev) return { r: 0, c: 0 };
      const nr = Math.max(0, Math.min(filteredRows.length - 1, prev.r + dr));
      const nc = Math.max(0, Math.min(numCols - 1, prev.c + dc));
      return { r: nr, c: nc };
    });
  };


  /* â”€â”€ row management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const addRow = () => {
    const cells = Array(numCols).fill("");
    cells[2] = false;
    const newRow = { id: Math.random().toString(36).slice(2, 9), cells };
    const updated = [...rows, newRow];
    setRows(updated);
    onUpdate(tracker.id, { rows: updated });
    // select the first cell of the new row
    setTimeout(() => setSelectedCell({ r: updated.length - 1, c: 0 }), 50);
  };

  const deleteRow = (rowId) => {
    const updated = rows.filter(r => r.id !== rowId);
    setRows(updated);
    onUpdate(tracker.id, { rows: updated });
    setSelectedCell(null);
    setEditingCell(null);
  };

  const clearAllRows = () => {
    if (!window.confirm("Delete ALL rows? This cannot be undone.")) return;
    setRows([]);
    setSelectedCell(null);
    setEditingCell(null);
    onUpdate(tracker.id, { rows: [] });
  };

  /* ── column management ──────────────────────────────────── */
  const insertColumn = (idx, direction) => {
    const insertAt = direction === "left" ? idx : idx + 1;
    const newH = [...headers];
    newH.splice(insertAt, 0, `Col ${headers.length + 1}`);
    setHeaders(newH);

    // Shift columnTypes and colWidths
    const newTypes = { ...columnTypes };
    const newWidths = { ...colWidths };
    for (let i = headers.length - 1; i >= insertAt; i--) {
      if (newTypes[i] !== undefined) {
        newTypes[i + 1] = newTypes[i];
      }
      if (newWidths[i] !== undefined) {
        newWidths[i + 1] = newWidths[i];
      }
    }
    newTypes[insertAt] = "text";
    setColumnTypes(newTypes);
    setColWidths(newWidths);

    const updated = rows.map(r => {
      const n = normalizeRow(r, headers.length);
      const newCells = [...n.cells];
      newCells.splice(insertAt, 0, "");
      return { ...n, cells: newCells };
    });
    setRows(updated);
    onUpdate(tracker.id, { headers: newH, rows: updated, columnTypes: newTypes, colWidths: newWidths });
  };

  const addColumn = () => {
    insertColumn(headers.length - 1, "right");
  };

  const renameHeader = (idx, val) => {
    const newH = [...headers];
    newH[idx] = val.trim() || newH[idx];
    setHeaders(newH);
    onUpdate(tracker.id, { headers: newH });
  };

  const deleteColumn = (idx) => {
    if (headers.length <= 1) return;
    if (!window.confirm(`Delete column "${headers[idx]}"? All data in this column will be lost.`)) return;
    const newH = headers.filter((_, i) => i !== idx);
    setHeaders(newH);

    const newTypes = { ...columnTypes };
    const newWidths = { ...colWidths };
    for (let i = idx; i < headers.length - 1; i++) {
      if (columnTypes[i + 1] !== undefined) newTypes[i] = columnTypes[i + 1];
      else delete newTypes[i];
      
      if (colWidths[i + 1] !== undefined) newWidths[i] = colWidths[i + 1];
      else delete newWidths[i];
    }
    delete newTypes[headers.length - 1];
    delete newWidths[headers.length - 1];
    
    setColumnTypes(newTypes);
    setColWidths(newWidths);

    const updated = rows.map(r => {
      const n = normalizeRow(r, headers.length);
      return { ...n, cells: n.cells.filter((_, i) => i !== idx) };
    });
    setRows(updated);
    onUpdate(tracker.id, { headers: newH, rows: updated, columnTypes: newTypes, colWidths: newWidths });
    setSelectedCell(null);
  };

  /* ── column resize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const startResize = (e, colIdx) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = getWidth(colIdx);
    resizeRef.current = { colIdx, startX, startW };

    const onMove = (me) => {
      const diff = me.clientX - resizeRef.current.startX;
      const newW = Math.max(COL_MIN, resizeRef.current.startW + diff);
      setColWidths(prev => ({ ...prev, [resizeRef.current.colIdx]: newW }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const newWidths = { ...colWidths, [resizeRef.current.colIdx]: getWidth(resizeRef.current.colIdx) };
      onUpdate(tracker.id, { colWidths: newWidths });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* ── paste from Excel/Sheets ──────────────────────────────────── */
  const handlePaste = (e) => {
    // Don't intercept if the user is editing a cell
    if (editingCell) return;
    const text = (e.clipboardData || window.clipboardData).getData("Text");
    if (!text) return;
    e.preventDefault();

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    let maxCols = numCols;
    const parsed = lines.map(line => {
      const cols = line.split("\t");
      if (cols.length > maxCols) maxCols = cols.length;
      return cols;
    });

    let newHeaders = [...headers];
    if (maxCols > headers.length) {
      for (let i = headers.length; i < maxCols; i++) newHeaders.push(`Col ${i + 1}`);
      setHeaders(newHeaders);
    }

    const newRows = parsed.map(cols => {
      const title = (cols[0] || "").trim();
      const rawLink = (cols[1] || "").trim();
      const rawDone = (cols[2] || "").trim().toLowerCase();

      let noteId = "";
      if (rawLink) {
        const m = rawLink.match(/\/note\/([^/\s?#]+)/);
        const slug = m ? m[1] : rawLink;
        const match = notes.find(n => n.slug === slug || n.title.toLowerCase() === slug.toLowerCase());
        if (match) noteId = match.id;
      }
      const done = ["yes","y","true","x","completed","1","✔","✓"].includes(rawDone);
      const cells = [title, noteId, done];
      for (let i = 3; i < maxCols; i++) cells.push((cols[i] || "").trim());
      return { id: Math.random().toString(36).slice(2, 9), cells };
    });

    const updated = [...rows.map(r => normalizeRow(r, maxCols)), ...newRows];
    setRows(updated);
    onUpdate(tracker.id, { headers: newHeaders, rows: updated });
  };

  /* ── stats ────────────────────────────────────────────────────── */
  const totalTasks = normalRows.length;
  const doneTasks  = normalRows.filter(r => !!r.cells[2]).length;
  const pct        = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const allDone    = totalTasks > 0 && doneTasks === totalTasks;

  /* ── render helper: cell display ────────────────────── */
  const renderCell = (row, rIdx, c) => {
    const isSelected = selectedCell?.r === rIdx && selectedCell?.c === c;
    const isEditing  = editingCell?.r  === rIdx && editingCell?.c  === c;
    const cellVal    = row.cells[c];
    const w          = getWidth(c);

    const baseCls = [
      "relative border-r border-b border-border/20",
      "overflow-hidden",
      isSelected && !isEditing
        ? "ring-2 ring-inset ring-primary bg-primary/5 z-10"
        : "hover:bg-muted/10",
    ].join(" ");

    // CHECKBOX column (index 2)
    if (getColType(c) === "checkbox") {
    
  return (
        <td
          key={c}
          className={baseCls + " text-center cursor-pointer select-none"}
          style={{ width: w, minWidth: w, maxWidth: w }}
          onClick={() => { setSelectedCell({ r: rIdx, c }); toggleCompleted(row.id, c); }}
          title={cellVal ? "Completed (Click to toggle)" : "Not Completed (Click to toggle)"}
        >
          <div className="flex items-center justify-center h-full py-2">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              cellVal
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border/60 hover:border-primary/60"
            }`}>
              {cellVal && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
          </div>
        </td>
      );
    }

    // LINKED NOTE column (index 1)
    if (getColType(c) === "note") {
      const linkedNote = notes.find(n => n.id === cellVal);
      if (isEditing) {
        // show a dropdown selector while editing col 1
      
  return (
          <td
            key={c}
            className={baseCls + " p-0"}
            style={{ width: w, minWidth: w, maxWidth: w }}
          >
            <select
              autoFocus
              value={cellVal || ""}
              onChange={(e) => {
                linkNote(row.id, e.target.value, c);
                setEditingCell(null);
              }}
              onBlur={() => setEditingCell(null)}
              className="w-full h-full px-3 py-2 text-sm bg-background border-0 outline-none focus:ring-0 cursor-pointer"
            >
              <option value="">🔗 — not linked —</option>
              {notes.map(note => (
                <option key={note.id} value={note.id}>{note.title}</option>
              ))}
            </select>
          </td>
        );
      }
    
  return (
        <td
          key={c}
          className={baseCls + " cursor-pointer"}
          style={{ width: w, minWidth: w, maxWidth: w }}
          onClick={() => setSelectedCell({ r: rIdx, c })}
          onDoubleClick={() => startEdit(rIdx, c)}
          title={linkedNote ? `Linked Note: ${linkedNote.title} (Ctrl+Click to open)` : "Double-click to link a note"}
        >
          <div className="px-3 py-2 h-full flex items-center gap-2 overflow-hidden">
            {linkedNote ? (
              <>
                <Link
                  to={`/note/${linkedNote.slug}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      setSelectedCell({ r: rIdx, c });
                    }
                  }}
                  className="text-xs font-semibold text-primary hover:underline truncate flex-1"
                  title="Ctrl+Click to open note"
                >
                  📄 {linkedNote.title}
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); linkNote(row.id, null, c); }}
                  className="text-muted-foreground hover:text-destructive text-[11px] shrink-0 px-1 rounded"
                >Ã¢Å“â€¢</button>
              </>
            ) : (
              <span className="text-muted-foreground/40 text-xs italic">double-click to link</span>
            )}
          </div>
        </td>
      );
    }

    // REGULAR TEXT column
    if (isEditing) {
    
  return (
        <td
          key={c}
          className={baseCls + " p-0"}
          style={{ width: w, minWidth: w, maxWidth: w }}
        >
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => commitEdit()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                commitEdit();
                if (e.key === "Enter") moveSel(1, 0);
                else moveSel(0, e.shiftKey ? -1 : 1);
              }
              if (e.key === "Escape") setEditingCell(null);
            }}
            className="w-full h-full px-3 py-2 text-sm bg-background border-0 outline-none focus:ring-0 text-foreground"
            style={{ minHeight: "36px" }}
          />
        </td>
      );
    }

    const displayVal = typeof cellVal === "boolean" ? "" : (cellVal ?? "");
  
  return (
      <td
        key={c}
        className={baseCls + " cursor-default"}
        style={{ width: w, minWidth: w, maxWidth: w }}
        onClick={() => setSelectedCell({ r: rIdx, c })}
        onDoubleClick={() => startEdit(rIdx, c)}
        title={displayVal ? String(displayVal) : "Empty cell (Double-click to edit)"}
      >
        <div className="px-3 py-2 text-sm text-foreground overflow-hidden whitespace-nowrap overflow-ellipsis h-full flex items-center" style={{ minHeight: "36px" }}>
          {renderCellContent(cellVal, rIdx, c)}
        </div>
      </td>
    );
  };


  /* Ã¢â€â‚¬Ã¢â€â‚¬ render Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

  return (
    <div
      className="flex flex-col h-full animate-fade-in"
      onPaste={handlePaste}
      onKeyDown={handleGridKeyDown}
      tabIndex={-1}
      style={{ outline: "none" }}
    >
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ TOP BANNER Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="shrink-0 px-1 pb-4 flex flex-col gap-4">
        {/* Title + progress */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Table className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight truncate">{tracker.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalTasks} rows Ã‚Â· {doneTasks} completed Ã‚Â· Paste from Excel with Ctrl+V
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-2xl font-black text-primary tabular-nums">{pct}%</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{doneTasks}/{totalTasks}</div>
            </div>
            <div className="w-28 h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct === 100
                    ? "hsl(142 71% 45%)"
                    : "hsl(var(--primary))",
                }}
              />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={trackerSearch}
              onChange={e => setTrackerSearch(e.target.value)}
              placeholder="Search rowsÃ¢â‚¬Â¦"
              className="w-full pl-9 pr-3 h-8 bg-muted/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
            />
          </div>

          <Button variant="outline" size="sm" onClick={addRow}
            className="h-8 px-3 rounded-lg text-xs gap-1.5 border-border/50">
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>

          <Button variant="outline" size="sm" onClick={addColumn}
            className="h-8 px-3 rounded-lg text-xs gap-1.5 border-border/50">
            <Plus className="h-3.5 w-3.5" /> Add Column
          </Button>

          <Button variant="ghost" size="sm" onClick={clearAllRows}
            disabled={rows.length === 0}
            className="h-8 px-3 rounded-lg text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </Button>

          <div className="ml-auto">
            <Button variant="destructive" size="sm" onClick={() => onDelete(tracker.id, tracker.name)}
              className="h-8 px-3 rounded-lg text-xs gap-1.5">
              <Trash className="h-3.5 w-3.5" /> Delete Tracker
            </Button>
          </div>
        </div>

        {/* ── Interactive Editor Panel ── */}
        <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
          selectedCell
            ? "border-primary/30 bg-gradient-to-r from-primary/5 to-transparent shadow-sm"
            : "border-border/30 bg-muted/20"
        }`}>
          {/* Header row */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-border/20">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono shrink-0">
              {selectedCell ? `CELL R${selectedCell.r + 1}C${selectedCell.c + 1}` : "EDITOR"}
            </span>
            {selectedCell && (
              <span className="text-xs text-muted-foreground truncate flex-1">
                {getColType(selectedCell.c) === "checkbox"
                  ? `Editing: ${headers[2] || "Completed"} (Row ${selectedCell.r + 1})`
                  : getColType(selectedCell.c) === "note"
                  ? `Editing: ${headers[1] || "Linked Note"} (Row ${selectedCell.r + 1})`
                  : `Editing: ${headers[selectedCell.c] || `Column ${selectedCell.c + 1}`} (Row ${selectedCell.r + 1})`}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {hasUnsavedFormulaEdit && (
                <span className="text-xs text-amber-500 font-medium animate-pulse">{String.fromCharCode(9679)} Unsaved</span>
              )}
              {selectedCell && !hasUnsavedFormulaEdit && (
                <span className="text-xs text-green-500 font-medium">{String.fromCharCode(10003)} Saved</span>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="px-3 py-2">
            {!selectedCell && (
              <p className="text-sm text-muted-foreground/50 italic py-1">
                Click any cell in the table to select it, then edit its value here
              </p>
            )}

            {/* CHECKBOX column editor */}
            {selectedCell && getColType(selectedCell.c) === "checkbox" && (() => {
              const row = filteredRows[selectedCell.r];
              const isChecked = !!(row?.cells[2]);
            
  return (
                <div className="flex items-center gap-4 py-1">
                  <button
                    onClick={toggleCompletedFromFormula}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                      isChecked
                        ? "border-green-500 bg-green-500/10 text-green-600"
                        : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isChecked ? "bg-green-500 border-green-500" : "border-current"
                    }`}>
                      {isChecked && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    {isChecked ? "Completed — Click to uncheck" : "Not completed — Click to check"}
                  </button>
                </div>
              );
            })()}

            {/* LINKED NOTE column editor */}
            {selectedCell && getColType(selectedCell.c) === "note" && (() => {
              const row = filteredRows[selectedCell.r];
              const currentNoteId = row?.cells[1] || "";
              const linkedNote = notes.find(n => n.id === currentNoteId);
            
  return (
                <div className="flex items-center gap-2 py-1">
                  <select
                    value={currentNoteId}
                    onChange={(e) => linkNoteFromFormula(e.target.value)}
                    className="flex-1 h-9 px-3 text-sm bg-background border border-border/50 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="">— not linked —</option>
                    {notes.map(note => (
                      <option key={note.id} value={note.id}>{note.title}</option>
                    ))}
                  </select>
                  {linkedNote && (
                    <Link
                      to={`/note/${linkedNote.slug}`}
                      onClick={(e) => { if (!e.ctrlKey && !e.metaKey) e.preventDefault(); }}
                      className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline font-medium px-2 py-1 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                      title="Ctrl+Click to open note"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Link>
                  )}
                </div>
              );
            })()}

            {/* REGULAR TEXT column editor */}
            {selectedCell && selectedCell.c !== 2 && selectedCell.c !== 1 && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={formulaEditValue}
                  onChange={(e) => handleFormulaTextareaChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      commitFormulaEdit();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      resetFormulaEdit();
                    }
                  }}
                  placeholder="Enter cell value... (Ctrl+Enter to save, Esc to discard)"
                  rows={2}
                  className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 resize-none text-foreground placeholder:text-muted-foreground/40 font-mono leading-relaxed transition-all"
                />
                {hasUnsavedFormulaEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={commitFormulaEdit}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold transition-all"
                    >
                      <Save className="h-3 w-3" /> Save Changes
                    </button>
                    <button
                      onClick={resetFormulaEdit}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border/50 rounded-lg text-muted-foreground hover:bg-muted/50 transition-all"
                    >
                      <X className="h-3 w-3" /> Discard
                    </button>
                    <span className="text-xs text-muted-foreground/50 ml-1">or press Ctrl+Enter / Esc</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ GRID Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto border border-border/40 rounded-xl shadow-lg"
        style={{ fontSize: "13px" }}
        onClick={() => { if (!editingCell) gridRef.current?.focus(); }}
      >
        <table
          className="border-collapse"
          style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}
        >
          {/* column widths via colgroup */}
          <colgroup>
            {/* row-number col */}
            <col style={{ width: "52px" }} />
            {headers.map((_, i) => (
              <col key={i} style={{ width: getWidth(i) }} />
            ))}
            {/* actions col */}
            <col style={{ width: "48px" }} />
          </colgroup>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ HEADER ROW Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <thead className="sticky top-0 z-20">
            <tr className="bg-muted/60 border-b-2 border-border/40 backdrop-blur">
              {/* corner cell */}
              <th
                className="border-r border-b border-border/30 bg-muted/80 text-center text-xs text-muted-foreground font-bold uppercase tracking-wider select-none cursor-pointer"
                style={{ width: 52, minWidth: 52 }}
                onClick={() => { if(primaryCheckboxCol !== -1) toggleAllCompleted(primaryCheckboxCol); }}
                title="Toggle all completed"
              >
                <div className="flex items-center justify-center h-full py-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    allDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border/60"
                  }`}>
                    {allDone && <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
              </th>

              {headers.map((hdr, hIdx) => (
                <HeaderThCell
                  key={hIdx}
                  title={hdr}
                  idx={hIdx}
                  width={getWidth(hIdx)}
                  colType={getColType(hIdx)}
                  onRename={renameHeader}
                  onDelete={headers.length > 1 ? deleteColumn : null}
                  onInsert={insertColumn}
                  onChangeType={updateColType}
                  onStartResize={startResize}
                />
              ))}

              {/* actions header */}
              <th className="border-r border-b border-border/30 bg-muted/80 text-center" style={{ width: 48, minWidth: 48 }} />
            </tr>
          </thead>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ BODY Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <tbody>
            {filteredRows.map((row, rIdx) => (
              <tr
                key={row.id}
                className={`group/row transition-colors ${
                  selectedCell?.r === rIdx ? "bg-primary/3" : "hover:bg-muted/5"
                }`}
              >
                {/* Row number */}
                <td
                  className="border-r border-b border-border/20 bg-muted/40 text-center text-xs text-muted-foreground font-medium select-none"
                  style={{ width: 52, minWidth: 52 }}
                >
                  {rIdx + 1}
                </td>

                {row.cells.map((_, c) => renderCell(row, rIdx, c))}

                {/* Delete action */}
                <td
                  className="border-b border-border/20 text-center"
                  style={{ width: 48, minWidth: 48 }}
                >
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded opacity-0 group-hover/row:opacity-100 transition-all mx-auto block"
                    title="Delete row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Empty state row */}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={numCols + 2}
                  className="py-16 text-center text-muted-foreground border-b border-border/20"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <Table className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {trackerSearch ? "No matching rows" : "This tracker is empty"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {trackerSearch
                          ? "Clear your search to see all rows"
                          : "Click \"Add Row\" above, or paste rows copied from Excel / Google Sheets (Ctrl+V)"}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {/* Add-row hint row */}
            {filteredRows.length > 0 && !trackerSearch && (
              <tr
                className="cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={addRow}
              >
                <td
                  colSpan={numCols + 2}
                  className="py-2 pl-4 text-xs text-muted-foreground/50 hover:text-primary transition-colors border-t border-dashed border-border/30"
                >
                  <Plus className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                  Click to add a new row
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};



export default TrackerView;

