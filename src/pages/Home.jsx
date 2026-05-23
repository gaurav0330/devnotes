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
  getUserTrackers,
  createTracker,
  updateTracker,
  deleteTracker,
  createNote,
} from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
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
  Table,
  Save,
  X,
  Sparkles,
  ExternalLink,
  Settings,
  Type,
  Link as LinkIcon,
  CheckSquare,
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronDown,
} from "lucide-react";

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

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [activeFolder, setActiveFolder] = useState("all");
  const [activeTrackerId, setActiveTrackerId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newTrackerName, setNewTrackerName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [showNewTrackerInput, setShowNewTrackerInput] = useState(false);
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

  /* Infinite Scroll Observer Ã¢â‚¬â€ re-runs whenever hasMore state changes */
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
  }, []);

  /* ----------------------------------------
     LOAD DATA
  ---------------------------------------- */
  const refresh = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [notesSnap, foldersSnap, trackersSnap] = await Promise.all([
        getUserNotes(user.uid),
        getUserFolders(user.uid),
        getUserTrackers(user.uid),
      ]);
      setNotes(notesSnap);
      setFolders(foldersSnap);
      setTrackers(trackersSnap);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh(true);
  }, [user, refresh]);

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
  // Highlight search queries in text

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

  /* ----------------------------------------
     TRACKER ACTIONS (NEW)
  ---------------------------------------- */
  const handleCreateTracker = useCallback(async () => {
    if (!newTrackerName.trim()) return;

    // Optimistic Update
    const tempId = Date.now().toString();
    const newTrackerObj = { id: tempId, name: newTrackerName.trim(), rows: [] };
    setTrackers((prev) => [...prev, newTrackerObj]);
    setNewTrackerName("");
    setShowNewTrackerInput(false);
    setActiveTrackerId(tempId); // select the newly created tracker
    setActiveFolder(null); // Deselect active folder

    try {
      const realId = await createTracker(user.uid, newTrackerObj.name);
      setTrackers((prev) =>
        prev.map((t) => (t.id === tempId ? { ...t, id: realId } : t))
      );
      setActiveTrackerId(realId);
      refresh();
    } catch (err) {
      console.error(err);
      refresh(); // Rollback
    }
  }, [user, newTrackerName, refresh]);

  const handleUpdateTracker = useCallback(async (trackerId, updates) => {
    // Optimistic Update
    setTrackers((prev) =>
      prev.map((t) => (t.id === trackerId ? { ...t, ...updates } : t))
    );

    try {
      await updateTracker(user.uid, trackerId, updates);
    } catch (err) {
      console.error("Tracker update failed:", err);
      refresh(); // Rollback
    }
  }, [user, refresh]);

  const handleDeleteTracker = useCallback(async (trackerId, trackerName) => {
    const ok = window.confirm(`Delete tracker "${trackerName}"?\nThis cannot be undone.`);
    if (!ok) return;

    // Optimistic Update
    setTrackers((prev) => prev.filter((t) => t.id !== trackerId));
    if (activeTrackerId === trackerId) setActiveTrackerId(null);

    try {
      await deleteTracker(user.uid, trackerId);
      refresh();
    } catch (err) {
      console.error(err);
      refresh();
    }
  }, [user, activeTrackerId, refresh]);

  const _handleCreateNoteAndLink = useCallback(async (trackerId, rowId, taskTitle) => {
    try {
      const noteTitle = taskTitle.trim() || "New Tracker Note";
      const slug = await createNote({
        title: noteTitle,
        content: "<p>Start writing notes for <strong>" + noteTitle + "</strong>...</p>",
        tags: ["tracker"],
        userId: user.uid,
        visibility: "private"
      });

      // Find the created note to get its Firestore ID
      const notesSnap = await getUserNotes(user.uid);
      setNotes(notesSnap);
      const newNote = notesSnap.find(n => n.slug === slug);
      if (!newNote) throw new Error("Could not retrieve created note ID");

      // Update tracker row with noteId
      const currentTracker = trackers.find(t => t.id === trackerId);
      if (currentTracker) {
        const numHeaders = currentTracker.headers?.length || 3;
        const updatedRows = currentTracker.rows.map(row => {
          const norm = normalizeRow(row, numHeaders);
          if (row.id === rowId) {
            const cells = [...norm.cells];
            cells[1] = newNote.id;
            return { ...norm, cells };
          }
          return norm;
        });
        // Save tracker update
        setTrackers((prev) =>
          prev.map((t) => (t.id === trackerId ? { ...t, rows: updatedRows } : t))
        );
        await updateTracker(user.uid, trackerId, { rows: updatedRows });
      }

      // Redirect to edit the new note
      navigate(`/edit/${slug}`);
    } catch (err) {
      console.error("Failed to create & link note:", err);
      alert("Failed to create & link note: " + err.message);
    }
  }, [user, trackers, navigate]);


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



  if (loading) {
  
  return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        <aside className="hidden md:flex w-72 border-r border-border/50 p-6 flex-col gap-8 bg-indigo-50/50 dark:bg-indigo-950/20 h-full overflow-y-auto scrollbar-thin shrink-0">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-full bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </aside>
        <main className="flex-1 p-8 md:p-12 overflow-y-auto max-w-6xl mx-auto w-full">
          <div className="h-10 w-48 bg-muted animate-pulse rounded mb-12" />
          <NotesGridSkeleton />
        </main>
      </div>
    );
  }


  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 border-r border-border/50 p-6 flex-col gap-8 bg-indigo-50/50 dark:bg-indigo-950/20 h-full overflow-y-auto scrollbar-thin shrink-0">
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
              onClick={() => {
                setActiveFolder("all");
                setActiveTrackerId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFolder === "all" && !activeTrackerId
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
              onClick={() => {
                setActiveFolder("unfiled");
                setActiveTrackerId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFolder === "unfiled" && !activeTrackerId
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
                  activeFolder === folder.id && !activeTrackerId
                    ? "bg-primary/10 text-primary"
                    : dragOverFolder === folder.id
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => {
                  setActiveFolder(folder.id);
                  setActiveTrackerId(null);
                }}
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
              onClick={() => {
                setActiveFolder("trash");
                setActiveTrackerId(null);
              }}
              className={`w-full mt-4 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFolder === "trash" && !activeTrackerId
                  ? "bg-red-500/10 text-red-500"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              Trash
            </button>
          </div>

          {/* TRACKERS SECTION (NEW) */}
          <div className="space-y-4 mt-8 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between group">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">
                Trackers
              </h2>
              <button
                onClick={() => setShowNewTrackerInput(true)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                title="New Tracker"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {showNewTrackerInput && (
                <div className="px-2 pb-4 space-y-2 animate-slide-down">
                  <Input
                    autoFocus
                    value={newTrackerName}
                    onChange={(e) => setNewTrackerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTracker()}
                    onBlur={() => !newTrackerName && setShowNewTrackerInput(false)}
                    placeholder="Tracker name..."
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 px-2 text-xs flex-1" onClick={handleCreateTracker}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowNewTrackerInput(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {trackers.map((tracker, ti) => (
                <div
                  key={tracker.id}
                  style={{ animationDelay: `${ti * 60}ms` }}
                  className={`group animate-sidebar-in flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                    activeTrackerId === tracker.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => {
                    setActiveTrackerId(tracker.id);
                    setActiveFolder(null);
                  }}
                >
                  <Table className="h-4 w-4 text-primary opacity-80" />
                  <span className="truncate flex-1">{tracker.name}</span>
                  <span className="text-xs opacity-60 group-hover:hidden">
                    {tracker.rows?.length || 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTracker(tracker.id, tracker.name);
                    }}
                    className="hidden group-hover:flex p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
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
      <main className={`flex-1 ${activeTrackerId ? "p-6 md:p-8 overflow-hidden flex flex-col" : "p-8 md:p-12 overflow-y-auto"} max-w-6xl mx-auto w-full animate-page-in`}>
        {activeTrackerId ? (
          <TrackerView 
            key={activeTrackerId}
            tracker={trackers.find(t => t.id === activeTrackerId)}
            notes={notes}
            onUpdate={handleUpdateTracker}
            onDelete={handleDeleteTracker}
          />
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}

/* ----------------------------------------
   SUB-COMPONENT: NOTE CARD
---------------------------------------- */
const Highlight = React.memo(({ text, query }) => {
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

const NoteCard = React.memo(({ note, userId, onTogglePin, onRefresh, onDragStart, search, animIndex = 0 }) => {
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


/* ============================================================
   EXCEL-LIKE SPREADSHEET Ã¢â‚¬â€  TrackerView
   ============================================================ */

/* Default column widths in pixels */
const COL_DEFAULTS = { 0: 260, 1: 220, 2: 110 };
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
  }, [editingCell, editValue, filteredRows, rows, numCols, tracker.id, onUpdate]);

  /* â”€â”€ start editing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const startEdit = useCallback((r, c, initialVal = null) => {
    if (getColType(c) === "checkbox") return;
    setEditingCell({ r, c });
    const cellVal = filteredRows[r]?.cells[c] ?? "";
    setEditValue(initialVal !== null ? initialVal : (typeof cellVal === "boolean" ? "" : String(cellVal)));
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [filteredRows]);

  /* â”€â”€ formula bar text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
    newH.splice(insertAt, 0, Col );
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


/* Ã¢â€â‚¬Ã¢â€â‚¬ Header TH Cell with resize handle Ã¢â€â‚¬Ã¢â€â‚¬ */
const HeaderThCell = React.memo(({ title, idx, width, onRename, onDelete, onStartResize }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  const startEditing = () => {
    setVal(title);
    setEditing(true);
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
          <span
            className="flex-1 min-w-0 truncate text-xs font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-primary transition-colors"
            onDoubleClick={startEditing}
            title="Double-click to rename"
          >
            {title}
          </span>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(idx)}
            className="shrink-0 text-muted-foreground/40 hover:text-destructive text-[11px] opacity-0 group-hover/th:opacity-100 transition-opacity px-0.5 rounded"
            title="Delete column"
          >Ã¢Å“â€¢</button>
        )}
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







