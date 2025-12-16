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
} from "lucide-react";

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = () => {
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const formatBlock = (tag) => {
    execCmd("formatBlock", tag);
  };

  const toolbarButtons = [
    { icon: Undo, cmd: "undo", tooltip: "Undo" },
    { icon: Redo, cmd: "redo", tooltip: "Redo" },
    { type: "divider" },
    { icon: Bold, cmd: "bold", tooltip: "Bold (Ctrl+B)" },
    { icon: Italic, cmd: "italic", tooltip: "Italic (Ctrl+I)" },
    { icon: Underline, cmd: "underline", tooltip: "Underline (Ctrl+U)" },
    { type: "divider" },
    {
      icon: Heading1,
      cmd: () => formatBlock("h1"),
      tooltip: "Heading 1",
    },
    {
      icon: Heading2,
      cmd: () => formatBlock("h2"),
      tooltip: "Heading 2",
    },
    { type: "divider" },
    { icon: AlignLeft, cmd: "justifyLeft", tooltip: "Align Left" },
    { icon: AlignCenter, cmd: "justifyCenter", tooltip: "Align Center" },
    { icon: AlignRight, cmd: "justifyRight", tooltip: "Align Right" },
    { type: "divider" },
    { icon: List, cmd: "insertUnorderedList", tooltip: "Bullet List" },
    { icon: ListOrdered, cmd: "insertOrderedList", tooltip: "Numbered List" },
    { type: "divider" },
    { icon: Quote, cmd: "formatBlock", value: "blockquote", tooltip: "Quote" },
    {
      icon: Code,
      cmd: "formatBlock",
      value: "pre",
      tooltip: "Code Block",
    },
  ];

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all duration-300 ${
        isFocused
          ? "ring-2 ring-blue-500 border-blue-500 shadow-lg"
          : "border-gray-300 hover:border-gray-400"
      }`}
    >
      {/* Toolbar */}
      <div className="bg-gray-50 border-b p-2 flex flex-wrap gap-1">
        {toolbarButtons.map((btn, idx) =>
          btn.type === "divider" ? (
            <div key={idx} className="w-px bg-gray-300 mx-1" />
          ) : (
            <Button
              key={idx}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-200 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                if (typeof btn.cmd === "function") {
                  btn.cmd();
                } else {
                  execCmd(btn.cmd, btn.value);
                }
              }}
              title={btn.tooltip}
            >
              <btn.icon className="h-4 w-4" />
            </Button>
          )
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="min-h-[400px] p-6 focus:outline-none prose prose-sm max-w-none
                   prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl
                   prose-p:text-gray-700 prose-p:leading-relaxed
                   prose-ul:list-disc prose-ol:list-decimal
                   prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic
                   prose-pre:bg-gray-100 prose-pre:p-4 prose-pre:rounded prose-code:text-sm"
        data-placeholder={placeholder}
        style={{
          minHeight: "400px",
        }}
      />

      <style jsx>{`
        [contentEditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}