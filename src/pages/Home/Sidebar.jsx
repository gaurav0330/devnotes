import { Folder, Trash2, Pin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { folderColor } from "./utils";

export default function Sidebar({
  folders,
  notes,
  activeFolder,
  setActiveFolder,
  pinned,
  setPinned,
  dragOverFolder,
  setDragOverFolder,
  onDrop,
  onCreateFolder,
  onDeleteFolder,
  newFolder,
  setNewFolder,
}) {
  const noteCount = (folderId) =>
    notes.filter((n) =>
      folderId === "unfiled"
        ? !n.folderId
        : folderId === "all"
        ? true
        : n.folderId === folderId
    ).length;

  return (
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
            onDrop={() => onDrop(folder.id)}
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
              onClick={() => onDeleteFolder(folder.id)}
            />
          </div>
        ))}

      <div className="mt-auto space-y-2">
        <Input
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          placeholder="New folder name"
        />
        <Button size="sm" onClick={onCreateFolder}>
          Create Folder
        </Button>
      </div>
    </aside>
  );
}
