import React from "react";
import { Link } from "react-router-dom";
import { 
  RotateCcw, 
  Trash, 
  Hash, 
  Pin, 
  Trash2, 
  Clock, 
  Calendar, 
  ChevronRight 
} from "lucide-react";
import { 
  restoreNoteById, 
  hardDeleteNoteById, 
  deleteNoteById,
  prefetchNote
} from "@/lib/notes.service";

export const Highlight = React.memo(({ text, query }) => {
  if (!query.trim()) return text;
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const safeQuery = escapeRegExp(query);
  const parts = text.split(new RegExp(`(${safeQuery})`, "gi"));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i}>{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
});
Highlight.displayName = "Highlight";

export const NoteCard = React.memo(({ note, userId, onTogglePin, onRefresh, onDragStart, search, animIndex = 0 }) => {
  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const contentText = stripHtml(note.content);
  const wordCount = contentText.trim().split(/\s+/).length || 1;
  const charCount = contentText.length;
  const readTime = Math.ceil(wordCount / 200);

  const getNoteColor = (tags) => {
    const t = (tags || []).map(tag => tag.toLowerCase());
    if (t.includes("java")) return "bg-java";
    if (t.includes("js") || t.includes("javascript")) return "bg-js";
    if (t.includes("python")) return "bg-python";
    if (t.includes("react")) return "bg-react";
    if (t.includes("dsa")) return "bg-dsa";
    return "bg-primary";
  };

  const accentColor = getNoteColor(note.tags);
  // Stagger delay based on index (cap at 500ms)
  const delay = Math.min(animIndex * 60, 500);

  const handleRestore = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await restoreNoteById(userId, note.id);
      onRefresh?.();
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  const handleHardDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this note? This cannot be undone.")) {
      try {
        await hardDeleteNoteById(userId, note.id);
        onRefresh?.();
      } catch (err) {
        console.error("Hard delete failed:", err);
      }
    }
  };

  const handleSoftDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteNoteById(userId, note.id);
      onRefresh?.();
    } catch (err) {
      console.error("Soft delete failed:", err);
    }
  };

  return (
    <Link
      to={note.deletedAt ? "#" : `/note/${note.slug}`}
      draggable={!note.deletedAt}
      onDragStart={!note.deletedAt ? onDragStart : undefined}
      onMouseEnter={() => {
        if (!note.deletedAt) {
          prefetchNote(userId, note.slug, note.visibility);
        }
      }}
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative flex flex-col border border-border/50 rounded-3xl p-6 bg-card transition-all duration-300 overflow-hidden animate-card-in ${
        note.deletedAt 
          ? "opacity-80 hover:opacity-100 border-red-500/20" 
          : "hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 card-hover"
      }`}
    >
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${note.deletedAt ? 'bg-red-500' : accentColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
      
      {note.deletedAt ? (
        <div className="absolute top-4 right-4 flex gap-2">
           <button
            onClick={handleRestore}
            className="p-2 bg-background/80 hover:bg-green-500 hover:text-white rounded-xl text-green-500 border border-green-500/20 transition-all backdrop-blur shadow-sm"
            title="Restore Note"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleHardDelete}
            className="p-2 bg-background/80 hover:bg-red-500 hover:text-white rounded-xl text-red-500 border border-red-500/20 transition-all backdrop-blur shadow-sm"
            title="Permanently Delete"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(`${window.location.origin}/note/${note.slug}`);
              alert("Link copied to clipboard!");
            }}
            className="p-2 rounded-xl bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary border border-border/50 transition-all"
            title="Copy Link"
          >
            <Hash className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onTogglePin(note.id, note.isPinned);
            }}
            className={`p-2 rounded-xl border transition-all backdrop-blur shadow-sm ${
              note.isPinned
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/80 text-muted-foreground hover:bg-primary/10 hover:text-primary border-border/50 opacity-0 group-hover:opacity-100"
            }`}
          >
            <Pin className={`h-4 w-4 ${note.isPinned ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={handleSoftDelete}
            className="p-2 rounded-xl bg-background/80 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 border border-border/50 transition-all backdrop-blur shadow-sm opacity-0 group-hover:opacity-100"
            title="Move to Trash"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-4 flex-1">
        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
          <Highlight text={note.title} query={search} />
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          <Highlight text={contentText} query={search} />
        </p>

        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {readTime} min read
          </span>
          <span>{charCount} chars</span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border/50 flex flex-col gap-4">
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {note.tags.map((t, i) => {
              const tagColor = getNoteColor([t]);
              return (
                <span 
                  key={i} 
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider transition-colors ${tagColor.replace('bg-', 'bg-')}`}
                >
                  {t}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground/60">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {new Date(note.createdAt).toLocaleDateString(undefined, { 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 text-primary transition-all transform translate-x-2 group-hover:translate-x-0">
            View <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
});
NoteCard.displayName = "NoteCard";
