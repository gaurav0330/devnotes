import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  getUserNotes,
  getUserFolders,
  createFolder,
  deleteFolder,
  moveNoteToFolder,
  togglePinNote,

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
import { NoteCard } from "@/components/NoteCard";
const TrackerView = React.lazy(() => import("@/components/TrackerView"));
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
  Link as LinkIcon,
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
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [visibleCount, setVisibleCount] = useState(12);
    const observer = useRef(null);
  const observerTarget = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 12);
      }
    }, { rootMargin: "200px", threshold: 0 });
    
    if (node) observer.current.observe(node);
  }, [loading]);

  /* Debounce Search */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setVisibleCount(12);
    }, 300);
  
  return () => clearTimeout(timer);
  }, [searchQuery]);

  

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

  const filteredFolders = useMemo(() => {
    if (!sidebarSearch.trim()) return folders;
    const q = sidebarSearch.toLowerCase();
    return folders.filter(f => f.name.toLowerCase().includes(q));
  }, [folders, sidebarSearch]);

  const filteredTrackers = useMemo(() => {
    if (!sidebarSearch.trim()) return trackers;
    const q = sidebarSearch.toLowerCase();
    return trackers.filter(t => t.name.toLowerCase().includes(q));
  }, [trackers, sidebarSearch]);

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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-9 pr-3 h-8 bg-card/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40 shadow-sm"
          />
        </div>
        
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

            {filteredFolders.map((folder, fi) => (
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

              {filteredTrackers.map((tracker, ti) => (
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
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground/50 animate-pulse">Loading Tracker...</div>}>
              <TrackerView 
            key={activeTrackerId}
            tracker={trackers.find(t => t.id === activeTrackerId)}
            notes={notes}
            onUpdate={handleUpdateTracker}
            onDelete={handleDeleteTracker}
          />
            </React.Suspense>
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

