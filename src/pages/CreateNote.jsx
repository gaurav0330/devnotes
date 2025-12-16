import { useState } from "react";
import { createNote } from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import { Save, Tag } from "lucide-react";

export default function CreateNote() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!content.trim() || content === "<br>") {
      alert("Please enter some content");
      return;
    }

    setSaving(true);
    try {
      const slug = await createNote({
        title,
        content,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        userId: user.uid,
        visibility,
      });
      navigate(`/note/${slug}`);
    } catch {
      alert("Failed to create note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">
          Create New Note
        </h1>

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter your note title..."
          className="text-2xl font-semibold h-14"
        />

        {/* Meta */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="pl-10"
            />
          </div>

          <select
            className="h-[42px] rounded-lg border border-border bg-background px-4 cursor-pointer"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="private">🔒 Private</option>
            <option value="public">🌍 Public</option>
          </select>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : <><Save className="h-4 w-4 mr-2" />Save</>}
          </Button>
        </div>

        {/* Editor */}
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Start writing your note..."
        />

        <p className="text-sm text-muted-foreground text-center">
          {visibility === "public"
            ? "📢 This note will be publicly accessible via a shareable link"
            : "🔐 This note will be private"}
        </p>
      </div>
    </div>
  );
}
