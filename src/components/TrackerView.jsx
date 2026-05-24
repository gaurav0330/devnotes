/**
 * TrackerView.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root tracker component. Manages state and wires up sub-components:
 *   TrackerToolbar  — title bar + search + buttons
 *   FormulaBar      — interactive cell editor panel
 *   HeaderThCell    — column header with working dropdown (BUG FIX #1)
 *   TrackerCell     — individual data cell (text / note / checkbox)
 *
 * BUGS FIXED
 * ──────────
 * #1 Column header arrow (▼) now opens a real dropdown menu with:
 *       rename, column-type switcher, insert left/right, delete
 * #2 New columns ("NEW") show proper empty cells, not "—"
 *       → createEmptyRow() uses getColType per-column, not hardcoded idx
 * #3 primaryCheckboxCol used everywhere instead of hardcoded index 2
 * #4 formulaEditValue syncs correctly when selectedCell changes
 * #5 colWidths saved with functional setState (no stale closure)
 * #6 Paste coerces values based on dynamic column types
 *
 * ADDITIONAL FEATURES
 * ───────────────────
 * • Column type badge visible in header
 * • "Insert left / Insert right" from header dropdown
 * • Resize handle on every column (drag right edge)
 * • Row count + completion % in real time
 * • Paste from Excel / Google Sheets (Tab-separated)
 * • Keyboard nav: arrows, Tab, Enter, F2, Delete, typing starts edit
 * • FormulaBar: live-edit text cells, Ctrl+Enter save, Esc discard
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Plus, Table } from "lucide-react";

import { HeaderThCell } from "./HeaderThCell";
import TrackerCell from "./TrackerCell";
import FormulaBar from "./FormulaBar";
import TrackerToolbar from "./TrackerToolbar";
import {
  normalizeRow,
  createEmptyRow,
  resolveColType,
  parsePastedText,
  getColWidth,
  DEFAULT_HEADERS,
  DEFAULT_COLUMN_TYPES,
} from "./trackerUtils";

/* ─────────────────────────────────────────────────────────────────────────── */

const TrackerView = ({ tracker, notes, onUpdate, onDelete }) => {
  /* ── core data state ─────────────────────────────────────────── */
  const [headers, setHeaders] = useState(
    () => tracker?.headers || DEFAULT_HEADERS
  );
  const [rows, setRows] = useState(() => {
    const hdrs = tracker?.headers || DEFAULT_HEADERS;
    return (tracker?.rows || []).map((r) => normalizeRow(r, hdrs.length));
  });
  const [colWidths, setColWidths] = useState(() => tracker?.colWidths || {});
  const [columnTypes, setColumnTypes] = useState(
    () => tracker?.columnTypes || DEFAULT_COLUMN_TYPES
  );

  /* ── derived helpers ──────────────────────────────────────────── */
  const numCols = headers.length;

  const getColType = useCallback(
    (c) => resolveColType(columnTypes, c),
    [columnTypes]
  );

  const getWidth = useCallback(
    (c) => getColWidth(colWidths, c),
    [colWidths]
  );

  const normalRows = useMemo(
    () => rows.map((r) => normalizeRow(r, numCols)),
    [rows, numCols]
  );

  /* ── search ───────────────────────────────────────────────────── */
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    if (!search.trim()) return normalRows;
    const q = search.toLowerCase();
    return normalRows.filter((r) =>
      r.cells.some((c) => String(c).toLowerCase().includes(q))
    );
  }, [normalRows, search]);

  /* ── selection / editing state ────────────────────────────────── */
  const [selectedCell, setSelectedCell] = useState(null); // {r, c}
  const [editingCell, setEditingCell] = useState(null);   // {r, c}
  const [editValue, setEditValue] = useState("");

  /* ── formula bar state ────────────────────────────────────────── */
  const [formulaValue, setFormulaValue] = useState("");
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const inputRef = useRef(null);
  const gridRef = useRef(null);
  const resizeRef = useRef(null);

  /* ── stats ────────────────────────────────────────────────────── */
  const primaryCheckboxCol = useMemo(
    () => headers.findIndex((_, i) => getColType(i) === "checkbox"),
    [headers, getColType]
  );

  const totalTasks = normalRows.length;
  const doneTasks =
    primaryCheckboxCol !== -1
      ? normalRows.filter((r) => !!r.cells[primaryCheckboxCol]).length
      : 0;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const allDone = totalTasks > 0 && doneTasks === totalTasks;

  /* ── sync formula bar when selection changes ──────────────────── */
  useEffect(() => {
    if (!selectedCell) {
      setFormulaValue("");
      setHasUnsaved(false);
      return;
    }
    const { r, c } = selectedCell;
    const cellVal = filteredRows[r]?.cells[c] ?? "";
    setFormulaValue(typeof cellVal === "boolean" ? "" : String(cellVal));
    setHasUnsaved(false);
  }, [selectedCell]); // intentionally only on selectedCell

  /* ── toggleCompleted ──────────────────────────────────────────── */
  const toggleCompleted = useCallback(
    (rowId, colIdx) => {
      const c = colIdx ?? primaryCheckboxCol ?? 2;
      const updated = rows.map((row) => {
        if (row.id !== rowId) return row;
        const norm = normalizeRow(row, numCols);
        const cells = [...norm.cells];
        cells[c] = !cells[c];
        return { ...norm, cells };
      });
      setRows(updated);
      onUpdate(tracker.id, { rows: updated });
    },
    [rows, numCols, tracker.id, onUpdate, primaryCheckboxCol]
  );

  const toggleAllCompleted = useCallback(
    (colIdx) => {
      const c = colIdx ?? primaryCheckboxCol ?? 2;
      const allDone = normalRows.every((r) => !!r.cells[c]);
      const updated = rows.map((row) => {
        const norm = normalizeRow(row, numCols);
        const cells = [...norm.cells];
        cells[c] = !allDone;
        return { ...norm, cells };
      });
      setRows(updated);
      onUpdate(tracker.id, { rows: updated });
    },
    [normalRows, rows, numCols, tracker.id, onUpdate, primaryCheckboxCol]
  );

  /* ── linkNote ─────────────────────────────────────────────────── */
  const linkNote = useCallback(
    (rowId, noteId, colIdx) => {
      const updated = rows.map((row) => {
        if (row.id !== rowId) return row;
        const norm = normalizeRow(row, numCols);
        const cells = [...norm.cells];
        cells[colIdx ?? 1] = noteId || "";
        return { ...norm, cells };
      });
      setRows(updated);
      onUpdate(tracker.id, { rows: updated });
    },
    [rows, numCols, tracker.id, onUpdate]
  );

  /* ── commitEdit ───────────────────────────────────────────────── */
  const commitEdit = useCallback(
    (newVal) => {
      if (!editingCell) return;
      const { r, c } = editingCell;
      const targetId = filteredRows[r]?.id;
      if (!targetId) return;

      const val = newVal ?? editValue;
      const updated = rows.map((row) => {
        if (row.id !== targetId) return row;
        const norm = normalizeRow(row, numCols);
        const cells = [...norm.cells];
        if (getColType(c) !== "checkbox") cells[c] = val;
        return { ...norm, cells };
      });
      setRows(updated);
      setEditingCell(null);
      onUpdate(tracker.id, { rows: updated });
    },
    [editingCell, editValue, filteredRows, rows, numCols, tracker.id, onUpdate, getColType]
  );

  /* ── startEdit ────────────────────────────────────────────────── */
  const startEdit = useCallback(
    (r, c, initialVal = null) => {
      if (getColType(c) === "checkbox") return;
      setEditingCell({ r, c });
      const cellVal = filteredRows[r]?.cells[c] ?? "";
      setEditValue(
        initialVal !== null
          ? initialVal
          : typeof cellVal === "boolean"
          ? ""
          : String(cellVal)
      );
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [filteredRows, getColType]
  );

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  /* ── formula bar actions ──────────────────────────────────────── */
  const handleFormulaChange = useCallback(
    (val) => {
      setFormulaValue(val);
      setHasUnsaved(true);
      if (!selectedCell) return;
      const { r, c } = selectedCell;
      const targetId = filteredRows[r]?.id;
      if (!targetId) return;
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== targetId) return row;
          const norm = normalizeRow(row, numCols);
          const cells = [...norm.cells];
          cells[c] = val;
          return { ...norm, cells };
        })
      );
    },
    [selectedCell, filteredRows, numCols]
  );

  const commitFormulaEdit = useCallback(() => {
    if (!selectedCell || !hasUnsaved) return;
    onUpdate(tracker.id, { rows });
    setHasUnsaved(false);
  }, [selectedCell, hasUnsaved, rows, tracker.id, onUpdate]);

  const discardFormulaEdit = useCallback(() => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const targetId = filteredRows[r]?.id;
    if (!targetId) return;
    const dbRow = tracker.rows?.find((row) => row.id === targetId);
    const orig = dbRow ? normalizeRow(dbRow, numCols).cells[c] : "";
    setFormulaValue(typeof orig === "boolean" ? "" : (orig ?? ""));
    setHasUnsaved(false);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== targetId) return row;
        const norm = normalizeRow(row, numCols);
        const cells = [...norm.cells];
        cells[c] = orig;
        return { ...norm, cells };
      })
    );
  }, [selectedCell, filteredRows, numCols, tracker.rows]);

  /* ── keyboard navigation ──────────────────────────────────────── */
  const moveSel = useCallback(
    (dr, dc) => {
      setSelectedCell((prev) => {
        if (!prev) return { r: 0, c: 0 };
        return {
          r: Math.max(0, Math.min(filteredRows.length - 1, prev.r + dr)),
          c: Math.max(0, Math.min(numCols - 1, prev.c + dc)),
        };
      });
    },
    [filteredRows.length, numCols]
  );

  const handleGridKeyDown = useCallback(
    (e) => {
      if (editingCell) {
        if (e.key === "Escape") { setEditingCell(null); return; }
        if (e.key === "Enter") { commitEdit(); moveSel(1, 0); return; }
        if (e.key === "Tab") { e.preventDefault(); commitEdit(); moveSel(0, e.shiftKey ? -1 : 1); return; }
        return;
      }
      if (!selectedCell) return;
      const { r, c } = selectedCell;
      const handlers = {
        F2: () => { e.preventDefault(); startEdit(r, c); },
        Enter: () => { e.preventDefault(); startEdit(r, c); },
        Delete: () => startEdit(r, c, ""),
        Backspace: () => startEdit(r, c, ""),
        Tab: () => { e.preventDefault(); moveSel(0, e.shiftKey ? -1 : 1); },
        ArrowUp: () => { e.preventDefault(); moveSel(-1, 0); },
        ArrowDown: () => { e.preventDefault(); moveSel(1, 0); },
        ArrowLeft: () => { e.preventDefault(); moveSel(0, -1); },
        ArrowRight: () => { e.preventDefault(); moveSel(0, 1); },
      };
      if (handlers[e.key]) { handlers[e.key](); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) startEdit(r, c, e.key);
    },
    [editingCell, selectedCell, commitEdit, moveSel, startEdit]
  );

  /* ── row management ───────────────────────────────────────────── */
  const addRow = useCallback(() => {
    // FIX #2: createEmptyRow uses getColType, not hardcoded index
    const newRow = createEmptyRow(numCols, getColType);
    const updated = [...rows, newRow];
    setRows(updated);
    onUpdate(tracker.id, { rows: updated });
    setTimeout(() => setSelectedCell({ r: updated.length - 1, c: 0 }), 50);
  }, [rows, numCols, getColType, tracker.id, onUpdate]);

  const deleteRow = useCallback(
    (rowId) => {
      const updated = rows.filter((r) => r.id !== rowId);
      setRows(updated);
      setSelectedCell(null);
      setEditingCell(null);
      onUpdate(tracker.id, { rows: updated });
    },
    [rows, tracker.id, onUpdate]
  );

  const clearAllRows = useCallback(() => {
    if (!window.confirm("Delete ALL rows? This cannot be undone.")) return;
    setRows([]);
    setSelectedCell(null);
    setEditingCell(null);
    onUpdate(tracker.id, { rows: [] });
  }, [tracker.id, onUpdate]);

  /* ── column management ────────────────────────────────────────── */
  const insertColumn = useCallback(
    (idx, direction) => {
      const insertAt = direction === "left" ? idx : idx + 1;
      const newH = [...headers];
      newH.splice(insertAt, 0, `Col ${headers.length + 1}`);

      const newTypes = { ...columnTypes };
      const newWidths = { ...colWidths };
      // Shift existing types/widths right of insertion point
      for (let i = headers.length - 1; i >= insertAt; i--) {
        if (newTypes[i] !== undefined) newTypes[i + 1] = newTypes[i];
        if (newWidths[i] !== undefined) newWidths[i + 1] = newWidths[i];
      }
      // FIX #2: new column always starts as "text" so cells are "" not "—"
      newTypes[insertAt] = "text";
      delete newWidths[insertAt]; // use default width

      const updated = rows.map((r) => {
        const n = normalizeRow(r, headers.length);
        const cells = [...n.cells];
        cells.splice(insertAt, 0, ""); // always "" for text column
        return { ...n, cells };
      });

      setHeaders(newH);
      setColumnTypes(newTypes);
      setColWidths(newWidths);
      setRows(updated);
      onUpdate(tracker.id, {
        headers: newH,
        rows: updated,
        columnTypes: newTypes,
        colWidths: newWidths,
      });
    },
    [headers, columnTypes, colWidths, rows, tracker.id, onUpdate]
  );

  const addColumn = useCallback(
    () => insertColumn(headers.length - 1, "right"),
    [insertColumn, headers.length]
  );

  const renameHeader = useCallback(
    (idx, val) => {
      const newH = [...headers];
      newH[idx] = val.trim() || newH[idx];
      setHeaders(newH);
      onUpdate(tracker.id, { headers: newH });
    },
    [headers, tracker.id, onUpdate]
  );

  const deleteColumn = useCallback(
    (idx) => {
      if (headers.length <= 1) return;
      if (!window.confirm(`Delete column "${headers[idx]}"? All data will be lost.`)) return;
      const newH = headers.filter((_, i) => i !== idx);
      const newTypes = {};
      const newWidths = {};
      for (let i = 0; i < headers.length - 1; i++) {
        const src = i < idx ? i : i + 1;
        if (columnTypes[src] !== undefined) newTypes[i] = columnTypes[src];
        if (colWidths[src] !== undefined) newWidths[i] = colWidths[src];
      }
      const updated = rows.map((r) => {
        const n = normalizeRow(r, headers.length);
        return { ...n, cells: n.cells.filter((_, i) => i !== idx) };
      });
      setHeaders(newH);
      setColumnTypes(newTypes);
      setColWidths(newWidths);
      setRows(updated);
      setSelectedCell(null);
      onUpdate(tracker.id, { headers: newH, rows: updated, columnTypes: newTypes, colWidths: newWidths });
    },
    [headers, columnTypes, colWidths, rows, tracker.id, onUpdate]
  );

  const updateColType = useCallback(
    (cIdx, newType) => {
      const newTypes = { ...columnTypes, [cIdx]: newType };
      setColumnTypes(newTypes);
      const updated = rows.map((r) => {
        const norm = normalizeRow(r, numCols);
        const cells = [...norm.cells];
        cells[cIdx] =
          newType === "checkbox"
            ? !!cells[cIdx]
            : typeof cells[cIdx] === "boolean"
            ? ""
            : String(cells[cIdx] ?? "");
        return { ...norm, cells };
      });
      setRows(updated);
      onUpdate(tracker.id, { columnTypes: newTypes, rows: updated });
    },
    [columnTypes, rows, numCols, tracker.id, onUpdate]
  );

  /* ── column resize ────────────────────────────────────────────── */
  const startResize = useCallback(
    (e, colIdx) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = getWidth(colIdx);
      resizeRef.current = { colIdx, startX, startW };

      const onMove = (me) => {
        const diff = me.clientX - resizeRef.current.startX;
        const newW = Math.max(60, resizeRef.current.startW + diff);
        setColWidths((prev) => ({ ...prev, [resizeRef.current.colIdx]: newW }));
      };
      // FIX #5: functional setState avoids stale colWidths closure
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setColWidths((prev) => {
          onUpdate(tracker.id, { colWidths: { ...prev } });
          return prev;
        });
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [getWidth, tracker.id, onUpdate]
  );

  /* ── paste from Excel/Sheets ──────────────────────────────────── */
  const handlePaste = useCallback(
    (e) => {
      if (editingCell) return;
      const text = (e.clipboardData || window.clipboardData).getData("Text");
      if (!text) return;
      e.preventDefault();

      // FIX #6: parsePastedText handles dynamic column types
      const result = parsePastedText(text, headers, columnTypes, notes);
      if (!result) return;

      const { newHeaders, newTypes, newRows } = result;
      const existing = rows.map((r) => normalizeRow(r, newHeaders.length));
      const combined = [...existing, ...newRows];

      setHeaders(newHeaders);
      setColumnTypes(newTypes);
      setRows(combined);
      onUpdate(tracker.id, { headers: newHeaders, rows: combined, columnTypes: newTypes });
    },
    [editingCell, headers, columnTypes, notes, rows, tracker.id, onUpdate]
  );

  /* ── guard ────────────────────────────────────────────────────── */
  if (!tracker) return null;

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <div
      className="flex flex-col h-full animate-fade-in"
      onPaste={handlePaste}
      onKeyDown={handleGridKeyDown}
      tabIndex={-1}
      style={{ outline: "none" }}
    >
      {/* Toolbar */}
      <TrackerToolbar
        tracker={tracker}
        totalTasks={totalTasks}
        doneTasks={doneTasks}
        pct={pct}
        allDone={allDone}
        search={search}
        rowCount={rows.length}
        onSearchChange={setSearch}
        onAddRow={addRow}
        onAddColumn={addColumn}
        onClearAll={clearAllRows}
        onDelete={() => onDelete(tracker.id, tracker.name)}
      />

      {/* Formula bar */}
      <div className="shrink-0 px-1 pb-3">
        <FormulaBar
          selectedCell={selectedCell}
          colType={selectedCell ? getColType(selectedCell.c) : "text"}
          headerLabel={
            selectedCell
              ? headers[selectedCell.c] || `Column ${selectedCell.c + 1}`
              : ""
          }
          cellRow={selectedCell ? filteredRows[selectedCell.r] : null}
          notes={notes}
          formulaValue={formulaValue}
          hasUnsaved={hasUnsaved}
          onTextChange={handleFormulaChange}
          onTextCommit={commitFormulaEdit}
          onTextDiscard={discardFormulaEdit}
          onToggleCheckbox={() => {
            if (!selectedCell) return;
            const targetId = filteredRows[selectedCell.r]?.id;
            if (targetId) toggleCompleted(targetId, selectedCell.c);
          }}
          onLinkNote={(noteId) => {
            if (!selectedCell) return;
            const targetId = filteredRows[selectedCell.r]?.id;
            if (targetId) linkNote(targetId, noteId, selectedCell.c);
          }}
        />
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto border border-border/40 rounded-xl shadow-lg"
        style={{ fontSize: "13px" }}
        onClick={() => {
          if (!editingCell) gridRef.current?.focus();
        }}
      >
        <table
          className="border-collapse"
          style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}
        >
          <colgroup>
            <col style={{ width: 52 }} />
            {headers.map((_, i) => (
              <col key={i} style={{ width: getWidth(i) }} />
            ))}
            <col style={{ width: 48 }} />
          </colgroup>

          {/* Header row */}
          <thead className="sticky top-0 z-20">
            <tr className="bg-muted/60 border-b-2 border-border/40 backdrop-blur">
              {/* Corner: toggle all */}
              <th
                className="border-r border-b border-border/30 bg-muted/80 text-center text-xs text-muted-foreground font-bold uppercase tracking-wider select-none cursor-pointer"
                style={{ width: 52, minWidth: 52 }}
                onClick={() => {
                  if (primaryCheckboxCol !== -1)
                    toggleAllCompleted(primaryCheckboxCol);
                }}
                title="Toggle all completed"
              >
                <div className="flex items-center justify-center h-full py-2">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      allDone
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border/60"
                    }`}
                  >
                    {allDone && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
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
              </th>

              {/* Column headers */}
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

              {/* Actions column header */}
              <th
                className="border-r border-b border-border/30 bg-muted/80"
                style={{ width: 48, minWidth: 48 }}
              />
            </tr>
          </thead>

          {/* Body */}
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

                {/* Data cells */}
                {row.cells.map((_, c) => (
                  <TrackerCell
                    key={c}
                    row={row}
                    rIdx={rIdx}
                    c={c}
                    colType={getColType(c)}
                    width={getWidth(c)}
                    isSelected={selectedCell?.r === rIdx && selectedCell?.c === c}
                    isEditing={editingCell?.r === rIdx && editingCell?.c === c}
                    notes={notes}
                    editValue={editValue}
                    inputRef={inputRef}
                    onSelect={() => setSelectedCell({ r: rIdx, c })}
                    onSetSelected={setSelectedCell}
                    onStartEdit={(r, col, init) => startEdit(r ?? rIdx, col ?? c, init)}
                    onCancelEdit={cancelEdit}
                    onCommit={commitEdit}
                    onEditChange={setEditValue}
                    onToggle={toggleCompleted}
                    onLink={(rowId, noteId, col) => {
                      linkNote(rowId, noteId, col);
                      setEditingCell(null);
                    }}
                    onMoveSel={moveSel}
                  />
                ))}

                {/* Delete button */}
                <td
                  className="border-b border-border/20 text-center"
                  style={{ width: 48, minWidth: 48 }}
                >
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded opacity-0 group-hover/row:opacity-100 transition-all mx-auto block"
                    title="Delete row"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}

            {/* Empty state */}
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
                        {search ? "No matching rows" : "This tracker is empty"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {search
                          ? "Clear your search to see all rows"
                          : 'Click "Add Row" above, or paste rows from Excel / Google Sheets (Ctrl+V)'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {/* Add-row hint */}
            {filteredRows.length > 0 && !search && (
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