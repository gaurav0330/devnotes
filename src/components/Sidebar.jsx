import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  SlidersHorizontal,
  Plus,
  LayoutGrid,
  Folder,
  ChevronUp,
  ChevronDown,
  Pin,
  Edit,
  Trash2,
  Table,
  ChevronLeft,
  ChevronRight,
  Hash,
} from "lucide-react";

// Folder color tag helper
const folderColor = (name) =>
  ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500"][
    name.charCodeAt(0) % 4
  ];

export default function Sidebar({
  sidebarOpen,
  sidebarWidth,
  isResizing,
  startResize,
  toggleSidebar,
  sidebarSearch,
  setSidebarSearch,
  folderSort,
  setFolderSort,
  folderFilter,
  setFolderFilter,
  pinnedFolders,
  pinnedTrackers,
  activeFolder,
  setActiveFolder,
  activeTrackerId,
  setActiveTrackerId,
  filteredFolders,
  filteredTrackers,
  noteCount,
  stats,
  moveFolder,
  reorderFolders,
  togglePinFolder,
  togglePinTracker,
  handleCreateFolder,
  handleRenameFolder,
  handleDeleteFolder,
  handleCreateTracker,
  handleDeleteTracker,
  editingFolderId,
  setEditingFolderId,
  editingFolderName,
  setEditingFolderName,
  handleDrop,
  draggingId,
}) {
  // Local sidebar-specific display states
  const [showFolderOptions, setShowFolderOptions] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewTrackerInput, setShowNewTrackerInput] = useState(false);
  const [newTrackerName, setNewTrackerName] = useState("");

  // Local drag-over states
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [dragOverTargetFolderId, setDragOverTargetFolderId] = useState(null);
  const [draggingFolderId, setDraggingFolderId] = useState(null);

  const folderOptionsRef = useRef(null);

  // Close typography settings when clicking outside
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

  // Wrapper for folder creation
  const onCreateFolderSubmit = () => {
    if (!newFolderName.trim()) return;
    handleCreateFolder(newFolderName);
    setNewFolderName("");
    setShowNewFolderInput(false);
  };

  // Wrapper for tracker creation
  const onCreateTrackerSubmit = () => {
    if (!newTrackerName.trim()) return;
    handleCreateTracker(newTrackerName);
    setNewTrackerName("");
    setShowNewTrackerInput(false);
  };

  return (
    <>
      {/* Mobile Sidebar backdrop overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => toggleSidebar(false)}
          className="fixed inset-0 bg-background/40 backdrop-blur-sm z-35 md:hidden animate-fade-in cursor-pointer"
        />
      )}

      {/* Sidebar open/collapse floating toggle handle */}
      <button
        onClick={toggleSidebar}
        style={{
          left: sidebarOpen ? `${sidebarWidth}px` : "0px"
        }}
        className={`
          fixed z-50 p-1.5 rounded-r-lg border border-l-0 border-border/50 bg-card hover:text-primary shadow-sm hover:shadow cursor-pointer
          top-[76px]
          ${isResizing ? "transition-none" : "transition-all duration-300 ease-in-out"}
        `}
        title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {/* SIDEBAR */}
      <aside 
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : "0px"
        }}
        className={`
          fixed md:static inset-y-0 left-0 z-40 
          flex flex-col gap-8 
          bg-indigo-50/50 dark:bg-indigo-950/20 
          h-full overflow-y-auto scrollbar-thin shrink-0
          relative
          ${isResizing ? "transition-none" : "transition-all duration-300 ease-in-out"}
          ${sidebarOpen ? "p-6 border-r border-border/50" : "w-0 p-0 border-none overflow-hidden"}
        `}
      >
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
          <div className="flex items-center justify-between group relative">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">
              Collections
            </h2>
            <div className="flex items-center gap-1">
              {/* Display settings dropdown */}
              <div ref={folderOptionsRef} className="relative">
                <button
                  onClick={() => setShowFolderOptions(!showFolderOptions)}
                  className={`p-1 rounded text-muted-foreground hover:bg-muted hover:text-primary transition-all cursor-pointer ${
                    showFolderOptions ? "bg-muted text-primary" : ""
                  }`}
                  title="Folder Display Options"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
                
                {showFolderOptions && (
                  <div className="absolute right-0 top-full mt-2 w-48 p-3 rounded-xl border border-border/50 bg-card shadow-lg z-50 animate-scale-in text-foreground">
                    <div className="space-y-3">
                      {/* Sort Options */}
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block mb-1">Sort</span>
                        <div className="flex flex-col gap-0.5">
                          {[
                            { value: "custom", label: "Custom (Manual)" },
                            { value: "alphabetical", label: "Alphabetical (A-Z)" },
                            { value: "count", label: "Note Count" }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setFolderSort(opt.value);
                                setShowFolderOptions(false);
                              }}
                              className={`text-left px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
                                folderSort === opt.value
                                  ? "bg-primary/10 text-primary font-bold"
                                  : "hover:bg-muted text-muted-foreground"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Filter Options */}
                      <div className="border-t border-border/50 pt-2">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block mb-1">Filter</span>
                        <div className="flex flex-col gap-0.5">
                          {[
                            { value: "all", label: "Show All" },
                            { value: "active", label: "Hide Empty" }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setFolderFilter(opt.value);
                                setShowFolderOptions(false);
                              }}
                              className={`text-left px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
                                folderFilter === opt.value
                                  ? "bg-primary/10 text-primary font-bold"
                                  : "hover:bg-muted text-muted-foreground"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowNewFolderInput(true)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                title="New Folder"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveFolder("all");
                setActiveTrackerId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] font-semibold transition-all ${
                activeFolder === "all" && !activeTrackerId
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-[17px] w-[17px] shrink-0" />
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] font-semibold transition-all ${
                activeFolder === "unfiled" && !activeTrackerId
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Folder className="h-[17px] w-[17px] shrink-0" />
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
                  onKeyDown={(e) => e.key === "Enter" && onCreateFolderSubmit()}
                  onBlur={() => !newFolderName && setShowNewFolderInput(false)}
                  placeholder="Folder name..."
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 px-2 text-xs flex-1" onClick={onCreateFolderSubmit}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowNewFolderInput(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {filteredFolders.map((folder, fi) => {
              const isEditing = editingFolderId === folder.id;
              const isPinned = pinnedFolders.includes(folder.id);
              
              const showSeparator = fi > 0 && !isPinned && pinnedFolders.includes(filteredFolders[fi - 1].id);

              return (
                <React.Fragment key={folder.id}>
                  {showSeparator && (
                    <div className="py-2 flex items-center gap-2 select-none px-2">
                      <div className="flex-1 border-t border-border/20" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/45 shrink-0">Other Collections</span>
                      <div className="flex-1 border-t border-border/20" />
                    </div>
                  )}
                  <div
                    draggable={folderSort === "custom"}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingFolderId(folder.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingFolderId) {
                        if (draggingFolderId !== folder.id) {
                          setDragOverTargetFolderId(folder.id);
                        }
                      } else if (draggingId) {
                        setDragOverFolder(folder.id);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverTargetFolderId(null);
                      setDragOverFolder(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingFolderId) {
                        reorderFolders(draggingFolderId, folder.id);
                        setDraggingFolderId(null);
                        setDragOverTargetFolderId(null);
                      } else {
                        handleDrop(folder.id);
                        setDragOverFolder(null);
                      }
                    }}
                    onDragEnd={() => {
                      setDraggingFolderId(null);
                      setDragOverTargetFolderId(null);
                    }}
                    style={{ animationDelay: `${fi * 60}ms` }}
                    className={`group animate-sidebar-in flex items-center gap-2 px-3 py-2 rounded-lg text-[15px] font-semibold cursor-pointer transition-all ${
                      activeFolder === folder.id && !activeTrackerId
                        ? "bg-primary/10 text-primary"
                        : dragOverFolder === folder.id || dragOverTargetFolderId === folder.id
                        ? "bg-primary/5 ring-1 ring-primary/30 scale-[1.01]"
                        : "text-muted-foreground hover:bg-muted"
                    } ${draggingFolderId === folder.id ? "opacity-40" : ""}`}
                    onClick={() => {
                      if (!isEditing) {
                        setActiveFolder(folder.id);
                        setActiveTrackerId(null);
                      }
                    }}
                  >
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${folderColor(folder.name)}`} />
                    
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFolder(folder.id);
                          if (e.key === "Escape") {
                            setEditingFolderId(null);
                            setEditingFolderName("");
                          }
                        }}
                        onBlur={() => handleRenameFolder(folder.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-background border border-border/85 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary text-foreground"
                      />
                    ) : (
                      <>
                        <span className="truncate flex-1">{folder.name}</span>
                        
                        <span className="text-xs opacity-60 group-hover:hidden">
                          {noteCount(folder.id)}
                        </span>

                        {/* Manual Reordering (Chevrons) - Only active in custom sort mode */}
                        {folderSort === "custom" && (
                          <div className="hidden group-hover:flex items-center gap-0.5 text-muted-foreground/80">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveFolder(folder.id, "up");
                              }}
                              className="p-0.5 hover:bg-muted-foreground/15 hover:text-foreground rounded transition-colors"
                              title="Move Up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveFolder(folder.id, "down");
                              }}
                              className="p-0.5 hover:bg-muted-foreground/15 hover:text-foreground rounded transition-colors"
                              title="Move Down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Pin Folder */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinFolder(folder.id);
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            pinnedFolders.includes(folder.id)
                              ? "flex text-primary bg-primary/10 hover:bg-primary/20"
                              : "hidden group-hover:flex text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                          title={pinnedFolders.includes(folder.id) ? "Unpin Folder" : "Pin Folder"}
                        >
                          <Pin className={`h-3 w-3 ${pinnedFolders.includes(folder.id) ? "fill-primary" : "rotate-45"}`} />
                        </button>

                        {/* Rename Folder (Edit) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditingFolderName(folder.name);
                          }}
                          className="hidden group-hover:flex p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="Rename Folder"
                        >
                          <Edit className="h-3 w-3" />
                        </button>

                        {/* Delete Folder */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id, folder.name);
                          }}
                          className="hidden group-hover:flex p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors cursor-pointer"
                          title="Delete Folder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* Trash button */}
            <button
              onClick={() => {
                setActiveFolder("trash");
                setActiveTrackerId(null);
              }}
              className={`w-full mt-4 flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] font-semibold transition-all ${
                activeFolder === "trash" && !activeTrackerId
                  ? "bg-red-500/10 text-red-500"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Trash2 className="h-[17px] w-[17px] shrink-0" />
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
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors cursor-pointer"
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
                    onKeyDown={(e) => e.key === "Enter" && onCreateTrackerSubmit()}
                    onBlur={() => !newTrackerName && setShowNewTrackerInput(false)}
                    placeholder="Tracker name..."
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 px-2 text-xs flex-1" onClick={onCreateTrackerSubmit}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowNewTrackerInput(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {filteredTrackers.map((tracker, ti) => {
                const isPinned = pinnedTrackers.includes(tracker.id);
                const showSeparator = ti > 0 && !isPinned && pinnedTrackers.includes(filteredTrackers[ti - 1].id);
                
                return (
                  <React.Fragment key={tracker.id}>
                    {showSeparator && (
                      <div className="py-2 flex items-center gap-2 select-none px-2">
                        <div className="flex-1 border-t border-border/20" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/45 shrink-0">Other Trackers</span>
                        <div className="flex-1 border-t border-border/20" />
                      </div>
                    )}
                    <div
                      style={{ animationDelay: `${ti * 60}ms` }}
                      className={`group animate-sidebar-in flex items-center gap-2 px-3 py-2 rounded-lg text-[15px] font-semibold cursor-pointer transition-all ${
                        activeTrackerId === tracker.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => {
                        setActiveTrackerId(tracker.id);
                        setActiveFolder(null);
                      }}
                    >
                      <Table className="h-[17px] w-[17px] text-primary opacity-80 shrink-0" />
                      <span className="truncate flex-1">{tracker.name}</span>
                      
                      <span className="text-xs opacity-60 group-hover:hidden">
                        {tracker.rows?.length || 0}
                      </span>

                      {/* Pin Tracker */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinTracker(tracker.id);
                        }}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isPinned
                            ? "flex text-primary bg-primary/10 hover:bg-primary/20"
                            : "hidden group-hover:flex text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        title={isPinned ? "Unpin Tracker" : "Pin Tracker"}
                      >
                        <Pin className={`h-3 w-3 ${isPinned ? "fill-primary" : "rotate-45"}`} />
                      </button>

                      {/* Delete Tracker */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTracker(tracker.id, tracker.name);
                        }}
                        className="hidden group-hover:flex p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors cursor-pointer"
                        title="Delete Tracker"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
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

      {/* Resize Handle */}
      {sidebarOpen && (
        <div
          onMouseDown={startResize}
          style={{
            left: `${sidebarWidth - 3}px`
          }}
          className="hidden md:block absolute top-0 w-1.5 h-full cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50"
          title="Drag to resize sidebar"
        />
      )}
    </>
  );
}
