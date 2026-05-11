import { useState, useEffect, useMemo } from "react";
import { createNote } from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import { Save, Tag, Maximize2, Minimize2, Clock, Trash2 } from "lucide-react";

export default function CreateNote() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [saving, setSaving] = useState(false);

  const [isFocusMode, setIsFocusMode] = useState(false);

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return tmp.textContent || tmp.innerText || "";
  };

  const contentText = useMemo(() => stripHtml(content), [content]);
  const wordCount = useMemo(() => contentText.trim().split(/\s+/).filter(Boolean).length, [contentText]);
  const charCount = contentText.length;

  /* Auto-save draft to LocalStorage */
  useEffect(() => {
    const draft = localStorage.getItem("note_draft");
    if (draft) {
      const { title: dTitle, content: dContent, tags: dTags } = JSON.parse(draft);
      if (window.confirm("Found an unsaved draft. Would you like to restore it?")) {
        setTitle(dTitle);
        setContent(dContent);
        setTags(dTags);
      } else {
        localStorage.removeItem("note_draft");
      }
    }
  }, []);

  useEffect(() => {
    if (title || content || tags) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("note_draft", JSON.stringify({ title, content, tags }));
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [title, content, tags]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!stripHtml(content).trim()) {
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
      localStorage.removeItem("note_draft");
      navigate(`/note/${slug}`);
    } catch {
      alert("Failed to create note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header Section */}
        <div className={`flex flex-col space-y-6 transition-all duration-500 ${isFocusMode ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              New Note
            </h1>
            <div className="flex items-center gap-2">
               <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (window.confirm("Clear all fields and draft?")) {
                    setTitle(""); setContent(""); setTags("");
                    localStorage.removeItem("note_draft");
                  }
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Clear
              </Button>
            </div>
          </div>

          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="text-3xl font-bold h-16 border-none bg-transparent px-0 focus-visible:ring-0 placeholder:opacity-30"
          />

          {/* Meta */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Add tags..."
                className="pl-10 h-11 bg-muted/30 border-none rounded-xl"
              />
            </div>

            <select
              className="h-11 rounded-xl border-none bg-muted/30 px-4 cursor-pointer text-sm font-medium"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="private">🔒 Private</option>
              <option value="public">🌍 Public</option>
            </select>

            <Button onClick={handleSave} disabled={saving} className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20">
              {saving ? (
                <>
                  <div className="spinner h-4 w-4 mr-2" />
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

        {/* Toolbar & Focus Toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <Clock className="h-3 w-3" /> Auto-saved
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`gap-2 rounded-full ${isFocusMode ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFocusMode ? "Exit Focus" : "Focus Mode"}
          </Button>
        </div>

        {/* Editor */}
        <div className={`transition-all duration-500 ${isFocusMode ? "max-w-3xl mx-auto pt-10" : ""}`}>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your note..."
            className="min-h-[500px]"
          />

          <div className="flex items-center justify-between mt-4 px-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
            <div className="flex gap-4">
              <span>{wordCount} Words</span>
              <span>{charCount} Characters</span>
            </div>
            <span>
              {visibility === "public" ? "📢 Public" : "🔐 Private"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}