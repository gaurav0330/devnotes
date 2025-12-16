import { useState } from "react";
import { createNote } from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import { Save, Tag, Globe, Lock } from "lucide-react";

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
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        userId: user.uid,
        visibility,
      });

      navigate(`/note/${slug}`);
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto p-6 animate-fade-in">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <h1 className="text-3xl font-bold text-gray-800 animate-slide-down">
            Create New Note
          </h1>

          {/* Title Input */}
          <Input
            placeholder="Enter your note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-semibold border-2 focus:border-blue-500 transition-all duration-300 h-14 animate-slide-down"
            style={{ animationDelay: "100ms" }}
          />

          {/* Metadata Row */}
          <div className="flex flex-wrap gap-3 animate-slide-down" style={{ animationDelay: "200ms" }}>
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
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="private">🔒 Private</option>
                <option value="public">🌍 Public</option>
              </select>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 px-6"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Note
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your note... Use the toolbar above to format your text."
          />
        </div>

        {/* Info Text */}
        <p className="text-sm text-gray-500 mt-4 text-center animate-fade-in" style={{ animationDelay: "400ms" }}>
          {visibility === "public"
            ? "📢 This note will be publicly accessible via a shareable link"
            : "🔐 This note will be private and only visible to you"}
        </p>
      </div>
    </div>
  );
}