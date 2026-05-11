import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  getUserNotes,
  getUserFolders,
  createFolder,
  deleteFolder,
  moveNoteToFolder,
  togglePinNote,
  deleteNoteById,
  hardDeleteNoteById,
  restoreNoteById,
} from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotesGridSkeleton } from "@/components/NoteSkeleton";
import Fuse from "fuse.js";
import {
  Plus,
  Folder,
  Trash2,
  Trash,
  RotateCcw,
  Calendar,
  Search,
  ArrowUpDown,
  Pin,
  Clock,
  MoreVertical,
  ChevronRight,
  LayoutGrid,
  Hash,
  FileText,
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(""); // Local instant state
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [visibleCount, setVisibleCount] = useState(12);
  const observerTarget = useRef(null);

  /* Debounce Search */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setVisibleCount(12);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* Infinite Scroll Observer — re-runs whenever hasMore state changes */
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  });

  /* ----------------------------------------
     LOAD DATA
  ---------------------------------------- */
  useEffect(() => {
    if (!user) return;
    refresh(true);
  }, [user]);

  const refresh = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [notesSnap, foldersSnap] = await Promise.all([
        getUserNotes(user.uid),
        getUserFolders(user.uid),
      ]);
      setNotes(notesSnap);
      setFolders(foldersSnap);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  /* ----------------------------------------
     HELPERS
  ---------------------------------------- */
  const folderColor = (name) =>
    ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500"][
      name.charCodeAt(0) % 4
    ];

  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || "";
  };

  const noteCount = (folderId) =>
    notes.filter((n) =>
      folderId === "unfiled"
        ? !n.folderId
        : folderId === "all"
        ? true
        : n.folderId === folderId
    ).length;

  /* ----------------------------------------
     HIGHLIGHT HELPER
  ---------------------------------------- */
  const Highlight = useCallback(
    ({ text, query }) => {
      if (!query.trim()) return text;
      const parts = text.split(new RegExp(`(${query})`, "gi"));
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
    },
    []
  );

  /* ----------------------------------------
     FOLDER ACTIONS
  ---------------------------------------- */
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    // Optimistic Update
    const tempId = Date.now().toString();
    const newFolderObj = { id: tempId, name: newFolderName.trim() };
    setFolders((prev) => [...prev, newFolderObj]);
    setNewFolderName("");
    setShowNewFolderInput(false);

    try {
      await createFolder(user.uid, newFolderName.trim());
      refresh();
    } catch (err) {
      console.error(err);
      refresh(); // Rollback
    }
  }, [user, newFolderName, refresh]);

  const handleDeleteFolder = useCallback(async (folderId, folderName) => {
    const ok = window.confirm(
      `Delete folder "${folderName}"?\nAll notes inside will be moved to Unfiled.`
    );
    if (!ok) return;

    // Optimistic Update
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (activeFolder === folderId) setActiveFolder("all");

    try {
      await deleteFolder(user.uid, folderId);
      refresh();
    } catch (err) {
      console.error(err);
      refresh();
    }
  }, [user, activeFolder, refresh]);

  const handleTogglePin = useCallback(async (noteId, currentPinned) => {
    // Optimistic Update
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isPinned: !currentPinned } : n))
    );

    try {
      await togglePinNote(user.uid, noteId, currentPinned);
    } catch (err) {
      console.error(err);
      refresh();
    }
  }, [user, refresh]);

  const handleDrop = useCallback(async (folderId) => {
    if (!draggingId) return;

    // Optimistic Update
    setNotes((prev) =>
      prev.map((n) => (n.id === draggingId ? { ...n, folderId } : n))
    );

    try {
      await moveNoteToFolder(user.uid, draggingId, folderId);
      setDraggingId(null);
      setDragOverFolder(null);
      refresh();
    } catch (err) {
      console.error(err);
      refresh();
    }
  }, [user, draggingId, refresh]);

  const processedNotes = useMemo(() => {
    let result = [...notes];

    // Filter out deleted notes unless we are in the trash folder
    if (activeFolder === "trash") {
      result = result.filter((n) => n.deletedAt);
    } else {
      result = result.filter((n) => !n.deletedAt);
      
      // Filter by folder
      if (activeFolder !== "all") {
        result = result.filter((n) =>
          activeFolder === "unfiled" ? !n.folderId : n.folderId === activeFolder
        );
      }
    }

    // Advanced Fuzzy Search with Fuse.js
    if (debouncedSearch.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'content', weight: 0.3 },
          { name: 'tags', weight: 0.5 }
        ],
        threshold: 0.3, // 0.0 requires perfect match, 1.0 matches anything
        ignoreLocation: true,
      });
      result = fuse.search(debouncedSearch).map(res => res.item);
    }

    // Sort
    result.sort((a, b) =>
      sort === "latest"
        ? (b.createdAt || 0) - (a.createdAt || 0)
        : (a.createdAt || 0) - (b.createdAt || 0)
    );

    return {
      pinned: result.filter((n) => n.isPinned),
      others: result.filter((n) => !n.isPinned),
    };
  }, [notes, activeFolder, debouncedSearch, sort]);

  const paginatedNotes = useMemo(() => {
    return {
      pinned: processedNotes.pinned,
      others: processedNotes.others.slice(0, visibleCount),
      hasMore: visibleCount < processedNotes.others.length
    };
  }, [processedNotes, visibleCount]);
  
  /* ----------------------------------------
     STATS HELPER
  ---------------------------------------- */
  const stats = useMemo(() => ({
    total: notes.length,
    pinned: notes.filter(n => n.isPinned).length,
    folders: folders.length,
    wordCount: notes.reduce((acc, n) => acc + (stripHtml(n.content).split(/\s+/).length), 0)
  }), [notes, folders]);

  const recentNotes = [...notes]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 4);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-background">
        <aside className="hidden md:flex w-72 border-r border-border/50 p-6 flex-col gap-8 bg-indigo-50/50 dark:bg-indigo-950/20 h-full">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-full bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </aside>
        <main className="flex-1 p-8 md:p-12 max-w-6xl mx-auto w-full">
          <div className="h-10 w-48 bg-muted animate-pulse rounded mb-12" />
          <NotesGridSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 border-r border-border/50 p-6 flex-col gap-8 bg-indigo-50/50 dark:bg-indigo-950/20 h-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between group">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">
              Collections
            </h2>
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
              title="New Folder"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setActiveFolder("all")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFolder === "all"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              All Notes
              <span className="ml-auto text-xs opacity-60">
                {noteCount("all")}
              </span>
            </button>

            <button
              onClick={() => setActiveFolder("unfiled")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFolder === "unfiled"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Folder className="h-4 w-4" />
              Unfiled
              <span className="ml-auto text-xs opacity-60">
                {noteCount("unfiled")}
              </span>
            </button>
          </div>

          <div className="space-y-1 mt-6">
            {showNewFolderInput && (
              <div className="px-2 pb-4 space-y-2 animate-slide-down">
                <Input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  onBlur={() => !newFolderName && setShowNewFolderInput(false)}
                  placeholder="Folder name..."
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 px-2 text-xs flex-1" onClick={handleCreateFolder}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowNewFolderInput(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {folders.map((folder, fi) => (
              <div
                key={folder.id}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragOverFolder(folder.id)}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={() => handleDrop(folder.id)}
                style={{ animationDelay: `${fi * 60}ms` }}
                className={`group animate-sidebar-in flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                  activeFolder === folder.id
                    ? "bg-primary/10 text-primary"
                    : dragOverFolder === folder.id
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setActiveFolder(folder.id)}
              >
                <div className={`h-2 w-2 rounded-full ${folderColor(folder.name)}`} />
                <span className="truncate flex-1">{folder.name}</span>
                <span className="text-xs opacity-60 group-hover:hidden">
                  {noteCount(folder.id)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id, folder.name);
                  }}
                  className="hidden group-hover:flex p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            <button
              onClick={() => setActiveFolder("trash")}
              className={`w-full mt-4 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFolder === "trash"
                  ? "bg-red-500/10 text-red-500"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              Trash
            </button>
          </div>
        </div>

        <div className="mt-auto space-y-6 pt-6 border-t border-border/50">
          {/* STATS */}
          <div className="grid grid-cols-2 gap-3 px-2">
            <div className="p-3 rounded-2xl bg-muted/50 border border-border/30">
              <div className="text-xl font-black text-primary">{stats.total}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notes</div>
            </div>
            <div className="p-3 rounded-2xl bg-muted/50 border border-border/30">
              <div className="text-xl font-black text-primary">{stats.pinned}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pinned</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-primary flex items-center gap-2">
              <Hash className="h-3 w-3" /> Quick Tip
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Drag and drop notes into folders to organize your workflow instantly.
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto max-w-6xl mx-auto w-full animate-page-in">
        <header className="mb-16">
          <h1 className={`text-6xl font-black tracking-tighter mb-4 ${activeFolder === 'trash' ? 'text-red-500' : 'gradient-text'}`}>
            {activeFolder === "trash" ? "Trash Bin" : "My Workspace"}
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            {activeFolder === "all" ? "Manage all your thoughts and snippets" : activeFolder === "trash" ? "Deleted notes will be kept here safely." : `Organizing: ${folders.find(f => f.id === activeFolder)?.name || activeFolder}`}
          </p>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row gap-6 mb-16">
          <div className="relative group max-w-3xl flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your notes..."
              className="w-full pl-14 h-16 bg-card/50 border-none rounded-3xl text-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/10 focus:shadow-[0_0_30px_hsla(var(--primary),0.1)] transition-all placeholder:text-muted-foreground/30"
            />
          </div>

          <Button
            variant="outline"
            className="h-12 px-6 rounded-2xl border-border/50 bg-card"
            onClick={() => setSort(sort === "latest" ? "oldest" : "latest")}
          >
            <ArrowUpDown className="h-4 w-4 mr-2 text-primary" />
            {sort === "latest" ? "Recent first" : "Oldest first"}
          </Button>
        </div>

        <div className="space-y-12">
          {/* PINNED SECTION */}
          {processedNotes.pinned.length > 0 && (
            <section className="space-y-6 animate-fade-in">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary/70">
                <Pin className="h-4 w-4 rotate-45" /> Pinned Notes
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedNotes.pinned.map((note, i) => (
                  <NoteCard 
                    key={note.id} 
                    note={note}
                    userId={user?.uid}
                    onTogglePin={handleTogglePin}
                    onRefresh={refresh}
                    onDragStart={() => setDraggingId(note.id)}
                    Highlight={Highlight}
                    search={debouncedSearch}
                    animIndex={i}
                  />
                ))}
              </div>
            </section>
          )}

          {/* OTHERS SECTION */}
          <section className="space-y-6">
            {processedNotes.pinned.length > 0 && (
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                All Notes
              </h3>
            )}
            {processedNotes.others.length === 0 && processedNotes.pinned.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold">No notes found</h3>
                <p className="text-muted-foreground max-w-xs">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedNotes.others.map((note, i) => (
                  <NoteCard 
                    key={note.id} 
                    note={note}
                    userId={user?.uid}
                    onTogglePin={handleTogglePin}
                    onRefresh={refresh}
                    onDragStart={() => setDraggingId(note.id)}
                    Highlight={Highlight}
                    search={debouncedSearch}
                    animIndex={i}
                  />
                ))}
              </div>
            )}

            {/* PAGINATION / INFINITE SCROLL */}
            {paginatedNotes.hasMore && (
              <div ref={observerTarget} className="mt-16 flex justify-center items-center py-8">
                <div className="flex flex-col items-center gap-4 text-muted-foreground/50 animate-pulse">
                  <div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm font-bold uppercase tracking-widest">Loading more notes...</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* ----------------------------------------
   SUB-COMPONENT: NOTE CARD
---------------------------------------- */
const NoteCard = React.memo(({ note, userId, onTogglePin, onRefresh, onDragStart, Highlight, search, animIndex = 0 }) => {
  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || "";
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
