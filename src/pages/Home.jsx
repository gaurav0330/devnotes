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
import { Input } from "@/components/ui/input";
import {
  Plus,
  Folder,
  Trash2,
  Calendar,
  Search,
  ArrowUpDown,
  Pin,
  Clock,
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState("all");
  const [newFolder, setNewFolder] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [pinned, setPinned] = useState([]);

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
     FOLDER ACTIONS
  ---------------------------------------- */
  const handleCreateFolder = async () => {
    if (!newFolder.trim()) return;
    await createFolder(user.uid, newFolder.trim());
    setNewFolder("");
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
     FILTER + SORT
  ---------------------------------------- */
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    result = result.filter((n) => {
      if (activeFolder === "all") return true;
      if (activeFolder === "unfiled") return !n.folderId;
      return n.folderId === activeFolder;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((n) =>
        n.title.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) =>
      sort === "latest"
        ? (b.createdAt || 0) - (a.createdAt || 0)
        : (a.createdAt || 0) - (b.createdAt || 0)
    );

    return result;
  }, [notes, activeFolder, search, sort]);

  const recentNotes = [...notes]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 border-r p-4 flex-col gap-3">
        <h2 className="font-bold">Folders</h2>

        <button onClick={() => setActiveFolder("all")}>
          📄 All Notes ({noteCount("all")})
        </button>

        <button onClick={() => setActiveFolder("unfiled")}>
          📂 Unfiled ({noteCount("unfiled")})
        </button>

        {[...folders]
          .sort((a, b) =>
            pinned.includes(a.id) ? -1 : pinned.includes(b.id) ? 1 : 0
          )
          .map((folder) => (
            <div
              key={folder.id}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDragOverFolder(folder.id)}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={() => handleDrop(folder.id)}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                dragOverFolder === folder.id && "bg-muted"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${folderColor(folder.name)}`}
              />
              <span onClick={() => setActiveFolder(folder.id)}>
                {folder.name} ({noteCount(folder.id)})
              </span>

              <Pin
                className="ml-auto h-4 w-4 cursor-pointer"
                onClick={() =>
                  setPinned((p) =>
                    p.includes(folder.id)
                      ? p.filter((x) => x !== folder.id)
                      : [...p, folder.id]
                  )
                }
              />

              <Trash2
                className="h-4 w-4 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteFolder(folder.id)}
              />
            </div>
          ))}

        <div className="mt-auto space-y-2">
          <Input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="New folder name"
          />
          <Button size="sm" onClick={handleCreateFolder}>
            Create Folder
          </Button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 space-y-6">
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold">My Notes</h1>
          <Link to="/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </Link>
        </div>

        {/* SEARCH */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
            <Input
              className="pl-9"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            onClick={() =>
              setSort(sort === "latest" ? "oldest" : "latest")
            }
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </Button>
        </div>

        {/* RECENTLY EDITED */}
        {activeFolder === "all" && recentNotes.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <Clock className="h-4 w-4" /> Recently Edited
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {recentNotes.map((n) => (
                <div key={n.id} className="p-3 border rounded-lg bg-muted">
                  {n.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTES GRID */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <Link
              key={note.id}
              to={`/note/${note.slug}`}
              draggable
              onDragStart={() => setDraggingId(note.id)}
              className="border rounded-xl p-4 space-y-3 bg-card hover:shadow-lg transition"
            >
              <h3 className="font-semibold">{note.title}</h3>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {stripHtml(note.content)}
              </p>

              {note.tags?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {note.tags.slice(0, 3).map((t, i) => (
                    <span key={i} className="badge badge-primary">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(note.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
