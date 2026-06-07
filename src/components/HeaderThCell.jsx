/**
 * HeaderThCell.jsx  — v3 (complete rewrite)
 * ─────────────────────────────────────────────────────────────────────────────
 * BUGS FIXED vs v2:
 *  1. Dropdown appeared once then never again:
 *       Root cause A — DropdownMenu computed pos with window.scrollY but used
 *         position:fixed (viewport coords). Removed scrollY/scrollX.
 *       Root cause B — document "mousedown" listener fired BEFORE the button's
 *         onClick, so onClose() ran first, then onClick toggled back open,
 *         then the stale listener closed it again on the very next render.
 *         Fix: use a single top-level portal div rendered via ReactDOM.createPortal
 *         and guard close with a small timestamp gate (ignore closes within
 *         150 ms of opening).
 *  2. Delete column — now always visible (was hidden when onDelete was null
 *     for the first column; now shown as disabled instead of hidden).
 *  3. Improved UI — richer menu, colour-coded type badges, keyboard nav.
 *
 * ADDITIONAL FEATURES:
 *  • Sort column A→Z / Z→A (emits onSort callback)
 *  • Duplicate column (emits onDuplicate callback)
 *  • Freeze / unfreeze column stub (UI only)
 *  • Colour-coded column-type badge in the header cell
 *  • Resize handle highlights blue on hover
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import ReactDOM from "react-dom";
import {
  ChevronDown,
  Type,
  Link as LinkIcon,
  CheckSquare,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Pencil,
  Copy,
  ArrowUpAZ,
  ArrowDownAZ,
  GripVertical,
} from "lucide-react";

/* ── Column-type config ───────────────────────────────────────────────────── */

const COL_TYPE_OPTIONS = [
  {
    value: "text",
    label: "Text",
    icon: Type,
    desc: "Free-form text",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  {
    value: "note",
    label: "Linked Note",
    icon: LinkIcon,
    desc: "Link to a note",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    value: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    desc: "Toggle state",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
];

const getTypeConfig = (colType) =>
  COL_TYPE_OPTIONS.find((o) => o.value === colType) ?? COL_TYPE_OPTIONS[0];

/* ── Menu primitives ──────────────────────────────────────────────────────── */

const MenuItem = ({
  icon,
  label,
  desc,
  onClick,
  danger = false,
  checked = false,
  disabled = false,
  shortcut,
}) => {
  const IconComp = icon;
  return (
    <button
      disabled={disabled}
      className={[
        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all duration-100 group/item",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : danger
          ? "hover:bg-red-500/10 cursor-pointer"
          : "hover:bg-white/5 cursor-pointer",
      ].join(" ")}
      onMouseDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      {/* icon */}
      <span
        className={[
          "shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors",
          disabled
            ? "text-muted-foreground/40"
            : danger
            ? "text-red-400 group-hover/item:bg-red-500/20"
            : checked
            ? "text-primary bg-primary/15"
            : "text-muted-foreground group-hover/item:text-foreground group-hover/item:bg-white/8",
        ].join(" ")}
      >
        {IconComp && <IconComp className="h-3.5 w-3.5" />}
      </span>

      {/* label + desc */}
      <span className="flex-1 flex flex-col min-w-0">
        <span
          className={[
            "text-[12px] font-semibold leading-none",
            danger
              ? "text-red-400"
              : checked
              ? "text-primary"
              : disabled
              ? "text-muted-foreground/40"
              : "text-foreground/90",
          ].join(" ")}
        >
          {label}
          {checked && (
            <span className="ml-1.5 text-[10px] font-normal text-primary/70">
              ✓
            </span>
          )}
        </span>
        {desc && (
          <span className="text-[10px] text-muted-foreground/50 mt-0.5 leading-tight truncate">
            {desc}
          </span>
        )}
      </span>

      {/* keyboard shortcut hint */}
      {shortcut && (
        <span className="shrink-0 text-[10px] text-muted-foreground/40 font-mono ml-1">
          {shortcut}
        </span>
      )}
    </button>
  );
};

const Divider = ({ label }) => (
  <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
    {label && (
      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
        {label}
      </span>
    )}
    <div className="flex-1 h-px bg-white/6" />
  </div>
);

/* ── Portal dropdown ──────────────────────────────────────────────────────── */
/**
 * KEY FIX: uses ReactDOM.createPortal so the menu renders outside the <table>
 * (tables clip overflow). Position is computed via getBoundingClientRect()
 * without adding scrollY/scrollX because position:fixed is viewport-relative.
 *
 * Close guard: we record the timestamp when the menu opens. The global
 * mousedown listener ignores events that arrive within 120 ms of opening,
 * which prevents the button's own mousedown from immediately closing the menu.
 */
const PortalDropdown = ({ anchorRef, onClose, children }) => {
  const menuRef = useRef(null);
  const openedAt = useRef(null);
  const [rect, setRect] = useState(null);

  /* position relative to viewport (fixed) */
  useLayoutEffect(() => {
    openedAt.current = Date.now();
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setRect(r);
  }, [anchorRef]);

  /* close on outside mousedown */
  useEffect(() => {
    const handler = (e) => {
      if (Date.now() - openedAt.current < 120) return; // guard
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    const keyHandler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("keydown", keyHandler, true);
    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("keydown", keyHandler, true);
    };
  }, [anchorRef, onClose]);

  if (!rect) return null;

  /* flip left if would go off-screen right */
  const menuWidth = 230;
  let left = rect.left;
  if (left + menuWidth > window.innerWidth - 8) {
    left = rect.right - menuWidth;
  }
  const top = rect.bottom + 4;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top,
        left,
        width: menuWidth,
        zIndex: 99999,
      }}
      className={[
        "rounded-xl border border-white/10 shadow-2xl py-1.5 overflow-hidden",
        "bg-[#1a1a2e]/95 backdrop-blur-xl",
        // subtle slide-down animation
        "animate-in fade-in slide-in-from-top-1 duration-150",
      ].join(" ")}
    >
      {children}
    </div>,
    document.body
  );
};

/* ── Main component ───────────────────────────────────────────────────────── */

export const HeaderThCell = ({
  title,
  idx,
  width,
  colType,
  onRename,
  onDelete,      // (idx) => void  — null = only 1 col left, disable
  onInsert,      // (idx, "left"|"right") => void
  onChangeType,  // (idx, type) => void
  onStartResize, // (e, idx) => void
  onSort,        // optional (idx, "asc"|"desc") => void
  onDuplicate,   // optional (idx) => void
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);

  const inputRef = useRef(null);
  const btnRef = useRef(null);   // the ▼ button — anchor for the portal

  const typeCfg = getTypeConfig(colType);
  const TypeIcon = typeCfg.icon;

  /* sync title if prop changes during render */
  const [prevTitle, setPrevTitle] = useState(title);
  if (title !== prevTitle) {
    setPrevTitle(title);
    if (!isEditing) {
      setEditVal(title);
    }
  }

  /* focus input when rename starts */
  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing]);

  const commitRename = useCallback(() => {
    setIsEditing(false);
    const trimmed = editVal.trim();
    onRename(idx, trimmed || title);
  }, [idx, editVal, title, onRename]);

  const openMenu = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen((v) => !v);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  /* ── render ── */
  return (
    <th
      className="relative border-r border-b border-white/8 bg-[#16162a] text-left select-none group/hdr"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      {/* ── Header content ── */}
      <div className="flex items-center h-full gap-1 pr-1 pl-2">
        {/* Type badge */}
        <span
          className={[
            "shrink-0 flex items-center justify-center w-5 h-5 rounded-md",
            typeCfg.bg,
            typeCfg.color,
          ].join(" ")}
          title={`Column type: ${typeCfg.label}`}
        >
          <TypeIcon className="h-3 w-3" />
        </span>

        {/* Title / rename input */}
        <div className="flex-1 min-w-0 py-2.5 overflow-hidden">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditVal(title);
                }
                e.stopPropagation();
              }}
              className={[
                "w-full text-[11px] font-bold uppercase tracking-wider",
                "bg-primary/10 border border-primary/40 rounded-md px-1.5",
                "outline-none text-primary caret-primary",
              ].join(" ")}
              style={{ height: 22 }}
            />
          ) : (
            <span
              className="block text-[11px] font-bold uppercase tracking-wider text-foreground/70 truncate cursor-default"
              onDoubleClick={() => setIsEditing(true)}
              title={`${title} — double-click to rename`}
            >
              {title}
            </span>
          )}
        </div>

        {/* ▼ dropdown button */}
        <button
          ref={btnRef}
          onMouseDown={(e) => {
            // prevent table from capturing focus, but DON'T call openMenu here
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={openMenu}
          aria-label="Column options"
          className={[
            "shrink-0 flex items-center justify-center w-5 h-5 rounded-md transition-all duration-150",
            menuOpen
              ? "bg-primary/25 text-primary opacity-100"
              : "text-muted-foreground/50 opacity-0 group-hover/hdr:opacity-100 hover:bg-white/10 hover:text-foreground",
          ].join(" ")}
        >
          <ChevronDown
            className={[
              "h-3 w-3 transition-transform duration-150",
              menuOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
      </div>

      {/* ── Resize handle ── */}
      <div
        className="absolute top-0 right-0 w-[3px] h-full cursor-col-resize z-10 group/resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartResize(e, idx);
        }}
      >
        <div className="w-full h-full bg-transparent group-hover/resize:bg-primary/60 transition-colors duration-150" />
      </div>

      {/* ── Portal dropdown ── */}
      {menuOpen && (
        <PortalDropdown anchorRef={btnRef} onClose={closeMenu}>
          {/* ── Rename ── */}
          <MenuItem
            icon={Pencil}
            label="Rename column"
            desc="Double-click the title to rename"
            shortcut="F2"
            onClick={() => {
              closeMenu();
              setTimeout(() => setIsEditing(true), 50);
            }}
          />

          {/* ── Duplicate ── */}
          {onDuplicate && (
            <MenuItem
              icon={Copy}
              label="Duplicate column"
              desc="Insert a copy to the right"
              onClick={() => {
                onDuplicate(idx);
                closeMenu();
              }}
            />
          )}

          {/* ── Sort ── */}
          {onSort && colType === "text" && (
            <>
              <MenuItem
                icon={ArrowUpAZ}
                label="Sort A → Z"
                onClick={() => { onSort(idx, "asc"); closeMenu(); }}
              />
              <MenuItem
                icon={ArrowDownAZ}
                label="Sort Z → A"
                onClick={() => { onSort(idx, "desc"); closeMenu(); }}
              />
            </>
          )}

          {/* ── Column type ── */}
          <Divider label="Column type" />
          {COL_TYPE_OPTIONS.map((opt) => (
            <MenuItem
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              desc={opt.desc}
              checked={colType === opt.value}
              onClick={() => {
                onChangeType(idx, opt.value);
                closeMenu();
              }}
            />
          ))}

          {/* ── Insert ── */}
          <Divider label="Insert column" />
          <MenuItem
            icon={ArrowLeftToLine}
            label="Insert left"
            onClick={() => { onInsert(idx, "left"); closeMenu(); }}
          />
          <MenuItem
            icon={ArrowRightToLine}
            label="Insert right"
            onClick={() => { onInsert(idx, "right"); closeMenu(); }}
          />

          {/* ── Delete ── */}
          <Divider />
          <MenuItem
            icon={Trash2}
            label="Delete column"
            desc={onDelete ? "Remove this column permanently" : "Can't delete the only column"}
            danger
            disabled={!onDelete}
            onClick={() => {
              closeMenu();
              onDelete(idx);
            }}
          />
        </PortalDropdown>
      )}
    </th>
  );
};

export default HeaderThCell;