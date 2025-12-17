import { useEffect, useMemo, useState } from "react";
import {
  getUserNotes,
  getUserFolders,
  createFolder,
  deleteFolder,
  moveNoteToFolder,
} from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/* COMPONENTS */
import Sidebar from "./Sidebar";
import NotesToolbar from "./NotesToolbar";
import NotesGrid from "./NotesGrid";
import RecentlyEdited from "./RecentlyEdited";

export default function Home() {
  const { user } = useAuth();

  /* ----------------------------------------
     STATE
  ---------------------------------------- */
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);

  const [activeFolder, setActiveFolder] = useState("all");
  const [newFolder, setNewFolder] = useState("");

  const [draggingId, setDraggingId] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [pinned, setPinned] = useState([]);

  const [loading, setLoading] = useState(true);

  /* ----------------------------------------
     LOAD DATA
  ---------------------------------------- */
  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [notesSnap, foldersSnap] = await Promise.all([
        getUserNotes(user.uid),
        getUserFolders(user.uid),
      ]);
      setNotes(notesSnap);
      setFolders(foldersSnap);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------
     FOLDER ACTIONS
  ---------------------------------------- */
  const handleCreateFolder = async () => {
    if (!newFolder.trim()) return;
    await createFolder(user.uid, newFolder.trim());
    setNewFolder("");
    setActiveFolder("all");
    refresh();
  };

  const handleDeleteFolder = async (folderId) => {
    const ok = window.confirm(
      "Delete this folder?\nAll notes will be moved to Unfiled."
    );
    if (!ok) return;

    await deleteFolder(user.uid, folderId);
    setActiveFolder("all");
    refresh();
  };

  const handleDrop = async (folderId) => {
    if (!draggingId) return;
    await moveNoteToFolder(user.uid, draggingId, folderId);
    setDraggingId(null);
    setDragOverFolder(null);
    refresh();
  };

  /* ----------------------------------------
     FILTER + SORT NOTES
  ---------------------------------------- */
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Folder filter
    result = result.filter((n) => {
      if (activeFolder === "all") return true;
      if (activeFolder === "unfiled") return !n.folderId;
      return n.folderId === activeFolder;
    });

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((n) =>
        n.title.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) =>
      sort === "latest"
        ? (b.createdAt || 0) - (a.createdAt || 0)
        : (a.createdAt || 0) - (b.createdAt || 0)
    );

    return result;
  }, [notes, activeFolder, search, sort]);

  /* ----------------------------------------
     RECENTLY EDITED
  ---------------------------------------- */
  const recentNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 3),
    [notes]
  );

  /* ----------------------------------------
     LOADING
  ---------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  /* ----------------------------------------
     UI
  ---------------------------------------- */
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background">
      {/* ===============================
          SIDEBAR (DESKTOP)
      ================================ */}
      <Sidebar
        folders={folders}
        notes={notes}
        activeFolder={activeFolder}
        setActiveFolder={setActiveFolder}
        pinned={pinned}
        setPinned={setPinned}
        dragOverFolder={dragOverFolder}
        setDragOverFolder={setDragOverFolder}
        onDrop={handleDrop}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        newFolder={newFolder}
        setNewFolder={setNewFolder}
      />

      {/* ===============================
          MAIN CONTENT
      ================================ */}
      <main className="flex-1 p-6 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Notes</h1>
          <Link to="/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </Link>
        </div>

        {/* SEARCH + SORT */}
        <NotesToolbar
          search={search}
          setSearch={setSearch}
          sort={sort}
          setSort={setSort}
        />

        {/* RECENTLY EDITED */}
        {activeFolder === "all" && (
          <RecentlyEdited notes={recentNotes} />
        )}

        {/* NOTES GRID */}
        <NotesGrid
          notes={filteredNotes}
          onDragStart={setDraggingId}
        />
      </main>
    </div>
  );
}
