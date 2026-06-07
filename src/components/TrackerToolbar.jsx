/**
 * TrackerToolbar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top banner: tracker title, progress indicator, search + action buttons.
 */

import React from "react";
import { Table, Search, Plus, Trash, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props:
 *  tracker          — tracker object { id, name }
 *  totalTasks       number
 *  doneTasks        number
 *  pct              number (0-100)
 *  allDone          boolean
 *  search           string
 *  rowCount         number  (current rows, used to disable "Clear All")
 *  onSearchChange   (val) => void
 *  onAddRow         () => void
 *  onAddColumn      () => void
 *  onClearAll       () => void
 *  onDelete         () => void
 */
const TrackerToolbar = ({
  tracker,
  totalTasks,
  doneTasks,
  pct,
  search,
  rowCount,
  onSearchChange,
  onAddRow,
  onAddColumn,
  onClearAll,
  onDelete,
}) => (
  <div className="shrink-0 px-1 pb-4 flex flex-col gap-4">
    {/* Title + progress */}
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Table className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight truncate">
            {tracker.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalTasks} rows · {doneTasks} completed · Paste from Excel with
            Ctrl+V
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <div className="text-2xl font-black text-primary tabular-nums">
            {pct}%
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            {doneTasks}/{totalTasks}
          </div>
        </div>
        <div className="w-28 h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background:
                pct === 100
                  ? "hsl(142 71% 45%)"
                  : "hsl(var(--primary))",
            }}
          />
        </div>
      </div>
    </div>

    {/* Action toolbar */}
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search rows…"
          className="w-full pl-9 pr-3 h-8 bg-muted/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddRow}
        className="h-8 px-3 rounded-lg text-xs gap-1.5 border-border/50"
      >
        <Plus className="h-3.5 w-3.5" /> Add Row
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddColumn}
        className="h-8 px-3 rounded-lg text-xs gap-1.5 border-border/50"
      >
        <Plus className="h-3.5 w-3.5" /> Add Column
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        disabled={rowCount === 0}
        className="h-8 px-3 rounded-lg text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" /> Clear All
      </Button>

      <div className="ml-auto">
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="h-8 px-3 rounded-lg text-xs gap-1.5"
        >
          <Trash className="h-3.5 w-3.5" /> Delete Tracker
        </Button>
      </div>
    </div>
  </div>
);

export default TrackerToolbar;