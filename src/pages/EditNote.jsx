import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPrivateNoteBySlug, updateNote } from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import { Save, ArrowLeft, Tag } from "lucide-react";

export default function EditNote() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadNote = async () => {
      try {
        const data = await getPrivateNoteBySlug(user.uid, slug);
        if (data) {
          setNote(data);
          setTags(data.tags ? data.tags.join(", ") : "");
        } else {
          alert("Note not found");
          navigate("/");
        }
      } catch (error) {
        console.error("Error loading note:", error);
        alert("Failed to load note");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [slug, user, navigate]);

  const handleUpdate = async () => {
    if (!note.title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!note.content.trim() || note.content === "<br>") {
      alert("Please enter some content");
      return;
    }

    setSaving(true);
    try {
      await updateNote({
        userId: user.uid,
        noteId: note.id,
        title: note.title,
        content: note.content,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        visibility: note.visibility,
      });

      navigate(`/note/${slug}`);
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600 animate-pulse">Loading note...</p>
        </div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto p-6 animate-fade-in">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(`/note/${slug}`)}
              className="hover:bg-gray-200 transition-all"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Edit Note</h1>
          </div>

          {/* Title Input */}
          <Input
            value={note.title}
            onChange={(e) => setNote({ ...note, title: e.target.value })}
            className="text-2xl font-semibold border-2 focus:border-blue-500 transition-all duration-300 h-14"
            placeholder="Note title..."
          />

          {/* Metadata Row */}
          <div className="flex flex-wrap gap-3">
            {/* Tags Input */}
            <div className="flex-1 min-w-[200px] relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Visibility Selector */}
            <div className="relative">
              <select
                className="border-2 rounded-lg px-4 py-2 pr-10 appearance-none bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer h-[42px]"
                value={note.visibility}
                onChange={(e) =>
                  setNote({ ...note, visibility: e.target.value })
                }
              >
                <option value="private">🔒 Private</option>
                <option value="public">🌍 Public</option>
              </select>
            </div>

            {/* Update Button */}
            <Button
              onClick={handleUpdate}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 px-6"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Note
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="animate-slide-up">
          <RichTextEditor
            value={note.content}
            onChange={(newContent) =>
              setNote({ ...note, content: newContent })
            }
            placeholder="Start writing your note..."
          />
        </div>

        {/* Info Text */}
        <p className="text-sm text-gray-500 mt-4 text-center">
          {note.visibility === "public"
            ? "📢 This note is publicly accessible"
            : "🔐 This note is private"}
        </p>
      </div>
    </div>
  );
}