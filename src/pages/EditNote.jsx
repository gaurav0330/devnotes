import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getPrivateNoteBySlug,
  updateNote,
  getUserFolders,
} from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import { Save, ArrowLeft, Tag, Folder } from "lucide-react";

export default function EditNote() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [note, setNote] = useState(null);
  const [folders, setFolders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState("");
  const [dirty, setDirty] = useState(false);

  /* ----------------------------------------
     LOAD NOTE
  ---------------------------------------- */
  useEffect(() => {
    if (!user) return;

    getPrivateNoteBySlug(user.uid, slug).then((data) => {
      if (!data) return navigate("/");
      setNote(data);
      setTags(data.tags?.join(", ") || "");
    });
  }, [slug, user, navigate]);

  /* ----------------------------------------
     LOAD FOLDERS
  ---------------------------------------- */
  useEffect(() => {
    if (!user) return;
    getUserFolders(user.uid).then(setFolders).catch(() => setFolders([]));
  }, [user]);

  /* ----------------------------------------
     DIRTY PAGE WARNING
  ---------------------------------------- */
  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* ----------------------------------------
     UPDATE NOTE
  ---------------------------------------- */
  const handleUpdate = async () => {
    if (!note) return;

    setSaving(true);
    try {
      await updateNote({
        userId: user.uid,
        noteId: note.id,
        title: note.title,
        content: note.content,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        visibility: note.visibility,
        folderId: note.folderId ?? null, // 🔥 NEW
      });

      setDirty(false);
      navigate(`/note/${slug}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update note");
    } finally {
      setSaving(false);
    }
  };

  if (!note) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(`/note/${slug}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Edit Note</h1>
        </div>

        {/* Title */}
        <Input
          value={note.title}
          onChange={(e) => {
            setDirty(true);
            setNote({ ...note, title: e.target.value });
          }}
          className="text-2xl font-semibold h-14"
          placeholder="Note title"
        />

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Tags */}
          <div className="flex-1 min-w-[220px] relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              value={tags}
              onChange={(e) => {
                setDirty(true);
                setTags(e.target.value);
              }}
              placeholder="Tags (comma separated)"
            />
          </div>

          {/* Folder Selector (NEW) */}
          <div className="relative min-w-[180px]">
            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              className="h-[42px] w-full rounded-lg border border-border bg-background pl-10 pr-4 cursor-pointer"
              value={note.folderId || ""}
              onChange={(e) => {
                setDirty(true);
                setNote({
                  ...note,
                  folderId: e.target.value || null,
                });
              }}
            >
              <option value="">📂 Unfiled</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  📁 {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <select
            className="h-[42px] rounded-lg border border-border bg-background px-4 cursor-pointer"
            value={note.visibility}
            onChange={(e) => {
              setDirty(true);
              setNote({ ...note, visibility: e.target.value });
            }}
          >
            <option value="private">🔒 Private</option>
            <option value="public">🌍 Public</option>
          </select>

          {/* Update Button */}
          <Button onClick={handleUpdate} disabled={saving}>
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </div>

        {/* Editor */}
        <RichTextEditor
          value={note.content}
          onChange={(content) => {
            setDirty(true);
            setNote({ ...note, content });
          }}
          placeholder="Start writing your note..."
        />

        <p className="text-sm text-muted-foreground text-center">
          {note.visibility === "public"
            ? "📢 This note is publicly accessible"
            : "🔐 This note is private"}
        </p>
      </div>
    </div>
  );
}
