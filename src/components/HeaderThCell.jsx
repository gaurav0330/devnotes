import React, { useState, useEffect, useRef } from "react";
import { 
  Type, 
  Link as LinkIcon, 
  CheckSquare, 
  ChevronDown, 
  ArrowLeftToLine, 
  ArrowRightToLine, 
  Trash 
} from "lucide-react";

export const HeaderThCell = React.memo(({ title, idx, width, colType, onRename, onDelete, onStartResize, onInsert, onChangeType }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const startEditing = () => {
    setVal(title);
    setEditing(true);
    setMenuOpen(false);
  };

  const commit = () => {
    setEditing(false);
    if (val.trim() && val.trim() !== title) onRename(idx, val.trim());
  };

  return (
    <th
      className="relative border-r border-b border-border/30 bg-muted/80 text-left select-none group/th"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="flex items-center h-full px-3 py-2 gap-1 overflow-hidden">
        {editing ? (
          <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") commit(); }}
            className="flex-1 min-w-0 text-xs font-bold uppercase tracking-wide bg-background border border-primary rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <div className="flex-1 min-w-0 flex items-center gap-1.5" onDoubleClick={startEditing}>
            {colType === "checkbox" && <CheckSquare className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
            {colType === "note" && <LinkIcon className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
            {colType === "text" && <Type className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
            <span
              className="truncate text-xs font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-primary transition-colors"
              title="Double-click to rename"
            >
              {title}
            </span>
          </div>
        )}

        {/* Dropdown Menu Toggle */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`shrink-0 flex items-center justify-center w-5 h-5 rounded hover:bg-muted-foreground/10 transition-colors ${menuOpen ? 'opacity-100 text-primary' : 'text-muted-foreground/40 opacity-0 group-hover/th:opacity-100'}`}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden font-sans text-left text-sm flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                Column Type
              </div>
              <button onClick={() => { onChangeType(idx, "text"); setMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 ${colType === "text" ? "text-primary font-medium" : "text-foreground"}`}>
                <Type className="h-3.5 w-3.5" /> Text
              </button>
              <button onClick={() => { onChangeType(idx, "note"); setMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 ${colType === "note" ? "text-primary font-medium" : "text-foreground"}`}>
                <LinkIcon className="h-3.5 w-3.5" /> Linked Note
              </button>
              <button onClick={() => { onChangeType(idx, "checkbox"); setMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 ${colType === "checkbox" ? "text-primary font-medium" : "text-foreground"}`}>
                <CheckSquare className="h-3.5 w-3.5" /> Checkbox Status
              </button>
              
              <div className="h-px bg-border/50 my-1 w-full" />
              
              <button onClick={() => { startEditing(); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-foreground">
                Rename Column
              </button>
              <button onClick={() => { onInsert(idx, "left"); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-foreground">
                <ArrowLeftToLine className="h-3.5 w-3.5" /> Insert Left
              </button>
              <button onClick={() => { onInsert(idx, "right"); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-foreground">
                <ArrowRightToLine className="h-3.5 w-3.5" /> Insert Right
              </button>
              
              {onDelete && (
                <>
                  <div className="h-px bg-border/50 my-1 w-full" />
                  <button onClick={() => { onDelete(idx); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-1.5 hover:bg-destructive/10 text-destructive">
                    <Trash className="h-3.5 w-3.5" /> Delete Column
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={e => onStartResize(e, idx)}
        className="absolute top-0 right-0 w-2 h-full cursor-col-resize flex items-center justify-center hover:bg-primary/20 active:bg-primary/40 transition-colors group/resize z-10"
        title="Drag to resize"
      >
        <div className="w-px h-4 bg-border/60 group-hover/resize:bg-primary group-hover/resize:w-0.5 transition-all" />
      </div>
    </th>
  );
});
HeaderThCell.displayName = "HeaderThCell";
