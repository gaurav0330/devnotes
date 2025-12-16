import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Quote,
  Code,
  Undo,
  Redo,
  Plus,
  Minus,
} from "lucide-react";

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [fontSize, setFontSize] = useState(3); // default browser font size

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = () => {
    onChange?.(editorRef.current.innerHTML);
  };

  const changeFontSize = (delta) => {
    const newSize = Math.min(7, Math.max(1, fontSize + delta));
    setFontSize(newSize);
    execCmd("fontSize", newSize);
  };

  const formatBlock = (tag) => execCmd("formatBlock", tag);

  const tools = [
    { icon: Undo, cmd: "undo" },
    { icon: Redo, cmd: "redo" },
    "divider",
    { icon: Bold, cmd: "bold" },
    { icon: Italic, cmd: "italic" },
    { icon: Underline, cmd: "underline" },
    "divider",
    { icon: Heading1, cmd: () => formatBlock("h1") },
    { icon: Heading2, cmd: () => formatBlock("h2") },
    "divider",
    { icon: AlignLeft, cmd: "justifyLeft" },
    { icon: AlignCenter, cmd: "justifyCenter" },
    { icon: AlignRight, cmd: "justifyRight" },
    "divider",
    { icon: List, cmd: "insertUnorderedList" },
    { icon: ListOrdered, cmd: "insertOrderedList" },
    "divider",
    { icon: Quote, cmd: () => formatBlock("blockquote") },
    { icon: Code, cmd: () => formatBlock("pre") },
  ];

  return (
    <div
      className={`rounded-lg border flex flex-col transition-all ${
        isFocused
          ? "border-primary ring-2 ring-primary/30"
          : "border-border"
      }`}
    >
      {/* 🔒 STICKY TOOLBAR */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-border bg-muted p-2">
        {tools.map((t, i) =>
          t === "divider" ? (
            <div key={i} className="w-px bg-border mx-1" />
          ) : (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onMouseDown={(e) => {
                e.preventDefault();
                typeof t.cmd === "function"
                  ? t.cmd()
                  : execCmd(t.cmd);
              }}
            >
              <t.icon className="h-4 w-4" />
            </Button>
          )
        )}

        {/* FONT SIZE */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              changeFontSize(-1);
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <span className="text-xs text-muted-foreground">
            A{fontSize}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              changeFontSize(1);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ✍️ SCROLLABLE EDITOR */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        className="min-h-[400px] max-h-[70vh] overflow-y-auto p-6 focus:outline-none prose max-w-none bg-background text-foreground"
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
