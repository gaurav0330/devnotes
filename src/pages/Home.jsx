import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  updateFolder,
} from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useDialog } from "@/context/DialogContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotesGridSkeleton } from "@/components/NoteSkeleton";
import { NoteCard } from "@/components/NoteCard";
const TrackerView = React.lazy(() => import("@/components/TrackerView"));
import Sidebar from "@/components/Sidebar";
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
  ChevronLeft,
  LayoutGrid,
  Hash,
  FileText,
  Table,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Edit,
  CheckSquare,
  XSquare,
} from "lucide-react";

import { hardDeleteNoteById, deleteNoteById } from "@/lib/notes.service";

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
  const queryClient = useQueryClient();
  const { showConfirm, showAlert } = useDialog();

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["notes", user?.uid],
    queryFn: () => getUserNotes(user.uid),
    enabled: !!user,
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["folders", user?.uid],
    queryFn: () => getUserFolders(user.uid),
    enabled: !!user,
  });

  const { data: trackers = [], isLoading: trackersLoading } = useQuery({
    queryKey: ["trackers", user?.uid],
    queryFn: () => getUserTrackers(user.uid),
    enabled: !!user,
  });

  const loading = notesLoading || foldersLoading || trackersLoading;

  const [activeFolder, setActiveFolder] = useState("all");
  const [activeTrackerId, setActiveTrackerId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState(""); // Local instant state
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [visibleCount, setVisibleCount] = useState(12);

  // Multi-Select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);

  // Preferences synchronization context
  const {
    sidebarOpen,
    toggleSidebar,
    sidebarWidth,
    setSidebarWidth,
    folderSort,
    setFolderSort,
    folderFilter,
    setFolderFilter,
    folderOrder,
    setFolderOrder,
    pinnedFolders,
    setPinnedFolders,
    pinnedTrackers,
    setPinnedTrackers
  } = usePreferences();

  const [showFolderOptions, setShowFolderOptions] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [isResizing, setIsResizing] = useState(false);

  const sidebarWidthRef = useRef(sidebarWidth);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const startResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(220, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const folderOptionsRef = useRef(null);

  // Toggle pin folder action
  const togglePinFolder = useCallback((folderId) => {
    setPinnedFolders(prev =>
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  }, [setPinnedFolders]);

  // Toggle pin tracker action
  const togglePinTracker = useCallback((trackerId) => {
    setPinnedTrackers(prev =>
      prev.includes(trackerId) ? prev.filter(id => id !== trackerId) : [...prev, trackerId]
    );
  }, [setPinnedTrackers]);

  // Close folder display options dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (folderOptionsRef.current && !folderOptionsRef.current.contains(e.target)) {
        setShowFolderOptions(false);
      }
    };
    if (showFolderOptions) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showFolderOptions]);
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
     LOAD DATA (TanStack Query Invalidation)
  ---------------------------------------- */
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notes", user?.uid] });
    queryClient.invalidateQueries({ queryKey: ["folders", user?.uid] });
    queryClient.invalidateQueries({ queryKey: ["trackers", user?.uid] });
  }, [user, queryClient]);

  /* ----------------------------------------
     HELPERS
  ---------------------------------------- */

  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || "";
  };

  const noteCount = useCallback((folderId) =>
    notes.filter((n) =>
      folderId === "unfiled"
        ? !n.folderId
        : folderId === "all"
        ? true
        : n.folderId === folderId
    ).length, [notes]);

  /* ----------------------------------------
     HIGHLIGHT HELPER
  ---------------------------------------- */
  // Highlight search queries in text

  /* ----------------------------------------
     MULTI-SELECT ACTIONS
  ---------------------------------------- */
  const toggleNoteSelection = useCallback((noteId) => {
    setSelectedNotes((prev) => 
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    );
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedNotes.length === 0) return;
    const ok = await showConfirm({
      title: "Delete Selected",
      message: `Are you sure you want to delete ${selectedNotes.length} notes?`,
      type: "danger"
    });
    if (!ok) return;

    try {
      if (activeFolder === "trash") {
        await Promise.all(selectedNotes.map(id => hardDeleteNoteById(user.uid, id)));
      } else {
        await Promise.all(selectedNotes.map(id => deleteNoteById(user.uid, id)));
      }
      setSelectedNotes([]);
      setIsSelectMode(false);
      refresh();
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Failed to delete notes.", type: "danger" });
    }
  }, [selectedNotes, activeFolder, user, refresh, showConfirm, showAlert]);

  const handleBulkPin = useCallback(async (pin = true) => {
    if (selectedNotes.length === 0) return;
    try {
      await Promise.all(selectedNotes.map(id => togglePinNote(user.uid, id, !pin)));
      setSelectedNotes([]);
      setIsSelectMode(false);
      refresh();
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Failed to pin notes.", type: "danger" });
    }
  }, [selectedNotes, user, refresh, showAlert]);

  /* ----------------------------------------
     FOLDER ACTIONS
  ---------------------------------------- */
  const handleCreateFolder = useCallback(async (folderName) => {
    if (!folderName || !folderName.trim()) return;
    const name = folderName.trim();

    try {
      await createFolder(user.uid, name);
      refresh();
    } catch (err) {
      console.error(err);
    }
  }, [user, refresh]);

  const handleDeleteFolder = useCallback(async (folderId, folderName) => {
    const ok = await showConfirm({
      title: "Delete Folder",
      message: `Delete folder "${folderName}"?\nAll notes inside will be moved to Unfiled.`,
      type: "danger"
    });
    if (!ok) return;

    if (activeFolder === folderId) setActiveFolder("all");

    try {
      await deleteFolder(user.uid, folderId);
      refresh();
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Failed to delete folder", type: "danger" });
    }
  }, [user, activeFolder, refresh, showConfirm, showAlert]);

  const handleTogglePin = useCallback(async (noteId, currentPinned) => {
    try {
      await togglePinNote(user.uid, noteId, currentPinned);
      refresh();
    } catch (err) {
      console.error(err);
    }
  }, [user, refresh]);

  const handleDrop = useCallback(async (folderId) => {
    if (!draggingId) return;

    try {
      await moveNoteToFolder(user.uid, draggingId, folderId);
      setDraggingId(null);
      refresh();
    } catch (err) {
      console.error(err);
    }
  }, [user, draggingId, refresh]);

  /* ----------------------------------------
     TRACKER ACTIONS (NEW)
  ---------------------------------------- */
  const handleCreateTracker = useCallback(async (trackerName) => {
    if (!trackerName || !trackerName.trim()) return;
    const name = trackerName.trim();

    setActiveFolder(null); // Deselect active folder

    try {
      const realId = await createTracker(user.uid, name);
      setActiveTrackerId(realId);
      refresh();
    } catch (err) {
      console.error(err);
    }
  }, [user, refresh]);

  const handleUpdateTracker = useCallback(async (trackerId, updates) => {
    try {
      await updateTracker(user.uid, trackerId, updates);
      refresh();
    } catch (err) {
      console.error("Tracker update failed:", err);
    }
  }, [user, refresh]);

  const handleDeleteTracker = useCallback(async (trackerId, trackerName) => {
    const ok = await showConfirm({
      title: "Delete Tracker",
      message: `Delete tracker "${trackerName}"?\nThis cannot be undone.`,
      type: "danger"
    });
    if (!ok) return;

    if (activeTrackerId === trackerId) setActiveTrackerId(null);

    try {
      await deleteTracker(user.uid, trackerId);
      refresh();
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Failed to delete tracker", type: "danger" });
    }
  }, [user, activeTrackerId, refresh, showConfirm, showAlert]);

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

      // Invalidate queries so that getUserNotes finds the created note
      queryClient.invalidateQueries({ queryKey: ["notes", user.uid] });
      const notesSnap = await getUserNotes(user.uid);
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
        
        await updateTracker(user.uid, trackerId, { rows: updatedRows });
        queryClient.invalidateQueries({ queryKey: ["trackers", user.uid] });
      }

      // Redirect to edit the new note
      navigate(`/edit/${slug}`);
    } catch (err) {
      console.error("Failed to create & link note:", err);
      showAlert({ title: "Error", message: "Failed to create & link note: " + err.message, type: "danger" });
    }
  }, [user, trackers, navigate, queryClient, showAlert]);


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

  const sortedFolders = useMemo(() => {
    let result = [...folders];

    // 1. Filter folders if filter preference is set to active (only non-empty)
    if (folderFilter === "active") {
      result = result.filter(f => noteCount(f.id) > 0);
    }

    // 2. Sort folders
    if (folderSort === "alphabetical") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (folderSort === "count") {
      result.sort((a, b) => noteCount(b.id) - noteCount(a.id));
    } else {
      // Custom reordered sort using stored folderOrder array
      if (folderOrder.length > 0) {
        result.sort((a, b) => {
          const idxA = folderOrder.indexOf(a.id);
          const idxB = folderOrder.indexOf(b.id);
          
          const posA = idxA === -1 ? Infinity : idxA;
          const posB = idxB === -1 ? Infinity : idxB;
          
          return posA - posB;
        });
      }
    }

    // 3. Float Pinned Folders to the Top
    result.sort((a, b) => {
      const isPinnedA = pinnedFolders.includes(a.id);
      const isPinnedB = pinnedFolders.includes(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return 0;
    });

    return result;
  }, [folders, folderOrder, folderSort, folderFilter, pinnedFolders, noteCount]);

  const filteredFolders = useMemo(() => {
    if (!sidebarSearch.trim()) return sortedFolders;
    const q = sidebarSearch.toLowerCase();
    return sortedFolders.filter(f => f.name.toLowerCase().includes(q));
  }, [sortedFolders, sidebarSearch]);

  const sortedTrackers = useMemo(() => {
    let result = [...trackers];

    // 1. Sort alphabetically by default
    result.sort((a, b) => a.name.localeCompare(b.name));

    // 2. Float Pinned Trackers to the Top
    result.sort((a, b) => {
      const isPinnedA = pinnedTrackers.includes(a.id);
      const isPinnedB = pinnedTrackers.includes(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return 0;
    });

    return result;
  }, [trackers, pinnedTrackers]);

  const filteredTrackers = useMemo(() => {
    if (!sidebarSearch.trim()) return sortedTrackers;
    const q = sidebarSearch.toLowerCase();
    return sortedTrackers.filter(t => t.name.toLowerCase().includes(q));
  }, [sortedTrackers, sidebarSearch]);

  // Swapping/Reordering logic
  const moveFolder = useCallback((folderId, direction) => {
    const currentSortedIds = sortedFolders.map(f => f.id);
    const index = currentSortedIds.indexOf(folderId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentSortedIds.length) return;

    const newOrder = [...currentSortedIds];
    const temp = newOrder[index];
    newOrder[index] = newOrder[newIndex];
    newOrder[newIndex] = temp;

    setFolderOrder(newOrder);
  }, [sortedFolders, setFolderOrder]);

  const reorderFolders = useCallback((draggedId, targetId) => {
    if (draggedId === targetId) return;

    const currentSortedIds = sortedFolders.map(f => f.id);
    const draggedIdx = currentSortedIds.indexOf(draggedId);
    const targetIdx = currentSortedIds.indexOf(targetId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;

    const newOrder = [...currentSortedIds];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedId);

    setFolderOrder(newOrder);
  }, [sortedFolders, setFolderOrder]);

  // Renaming folder logic
  const handleRenameFolder = useCallback(async (folderId) => {
    const newName = editingFolderName.trim();
    if (!newName || newName === folders.find(f => f.id === folderId)?.name) {
      setEditingFolderId(null);
      setEditingFolderName("");
      return;
    }

    setEditingFolderId(null);
    setEditingFolderName("");

    try {
      await updateFolder(user.uid, folderId, newName);
      refresh();
    } catch (err) {
      console.error(err);
      refresh();
    }
  }, [user, editingFolderName, folders, refresh]);

  if (loading) {
  
  return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        <aside 
          style={{
            width: sidebarOpen ? `${sidebarWidth}px` : "0px"
          }}
          className={`
            hidden md:flex border-r border-border/50 p-6 flex-col gap-8 bg-indigo-50/50 dark:bg-indigo-950/20 h-full overflow-y-auto scrollbar-thin shrink-0 transition-all duration-300 ease-in-out
            ${sidebarOpen ? "" : "w-0 p-0 border-none overflow-hidden"}
          `}
        >
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background relative">
      {/* SIDEBAR COMPONENT */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        sidebarWidth={sidebarWidth}
        isResizing={isResizing}
        startResize={startResize}
        toggleSidebar={toggleSidebar}
        sidebarSearch={sidebarSearch}
        setSidebarSearch={setSidebarSearch}
        folderSort={folderSort}
        setFolderSort={setFolderSort}
        folderFilter={folderFilter}
        setFolderFilter={setFolderFilter}
        pinnedFolders={pinnedFolders}
        pinnedTrackers={pinnedTrackers}
        activeFolder={activeFolder}
        setActiveFolder={setActiveFolder}
        activeTrackerId={activeTrackerId}
        setActiveTrackerId={setActiveTrackerId}
        filteredFolders={filteredFolders}
        filteredTrackers={filteredTrackers}
        noteCount={noteCount}
        stats={stats}
        moveFolder={moveFolder}
        reorderFolders={reorderFolders}
        togglePinFolder={togglePinFolder}
        togglePinTracker={togglePinTracker}
        handleCreateFolder={handleCreateFolder}
        handleRenameFolder={handleRenameFolder}
        handleDeleteFolder={handleDeleteFolder}
        handleCreateTracker={handleCreateTracker}
        handleDeleteTracker={handleDeleteTracker}
        editingFolderId={editingFolderId}
        setEditingFolderId={setEditingFolderId}
        editingFolderName={editingFolderName}
        setEditingFolderName={setEditingFolderName}
        handleDrop={handleDrop}
        draggingId={draggingId}
      />

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

              <div className="flex gap-4">
                <Button
                  variant={isSelectMode ? "default" : "outline"}
                  className={`h-12 px-6 rounded-2xl border-border/50 ${isSelectMode ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    if (isSelectMode) setSelectedNotes([]);
                  }}
                >
                  {isSelectMode ? <XSquare className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                  {isSelectMode ? "Cancel Selection" : "Select"}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-6 rounded-2xl border-border/50 bg-card"
                  onClick={() => setSort(sort === "latest" ? "oldest" : "latest")}
                >
                  <ArrowUpDown className="h-4 w-4 mr-2 text-primary" />
                  {sort === "latest" ? "Recent first" : "Oldest first"}
                </Button>
              </div>
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
                        isSelectMode={isSelectMode}
                        isSelected={selectedNotes.includes(note.id)}
                        onToggleSelect={() => toggleNoteSelection(note.id)}
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
                        isSelectMode={isSelectMode}
                        isSelected={selectedNotes.includes(note.id)}
                        onToggleSelect={() => toggleNoteSelection(note.id)}
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

        {/* FLOATING ACTION BAR FOR MULTI-SELECT */}
        {isSelectMode && selectedNotes.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border/50 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 animate-fade-in z-50">
            <span className="font-bold text-sm">
              {selectedNotes.length} selected
            </span>
            <div className="flex items-center gap-2 border-l border-border/50 pl-6">
              {activeFolder !== "trash" && (
                <Button variant="ghost" size="sm" onClick={() => handleBulkPin(true)} className="hover:bg-primary/10 hover:text-primary">
                  <Pin className="h-4 w-4 mr-2" /> Pin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="hover:bg-red-500/10 hover:text-red-500 text-red-500">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

