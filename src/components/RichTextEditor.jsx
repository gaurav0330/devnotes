import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2,
  List, ListOrdered, Quote, Minus, Table as TableIcon
} from "lucide-react";

import 'highlight.js/styles/github-dark.css'; // Syntax highlighting theme

const lowlight = createLowlight(common);

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-border/50 bg-card/80 backdrop-blur-md p-2 rounded-t-xl">
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </Button>
      <div className="w-px bg-border mx-1 my-1" />
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Button>
      <div className="w-px bg-border mx-1 my-1" />
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('codeBlock') ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code className="h-4 w-4" />
      </Button>
      <div className="w-px bg-border mx-1 my-1" />
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive('table') ? 'bg-primary/20 text-primary' : ''}`} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <TableIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function RichTextEditor({ value, onChange, placeholder, className = "" }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder: placeholder || 'Start typing or use "/" for commands...' }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-6',
      },
    },
  });

  // Keep content synced if it changes externally (like loading a draft)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className={`rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-inner overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 ${className}`}>
      <MenuBar editor={editor} />
      
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex overflow-hidden rounded-lg border border-border/50 bg-card/90 backdrop-blur-lg shadow-xl">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-3 py-1.5 text-sm font-medium hover:bg-muted ${editor.isActive('bold') ? 'text-primary bg-primary/10' : ''}`}>
            Bold
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-3 py-1.5 text-sm font-medium hover:bg-muted border-l border-border/50 ${editor.isActive('italic') ? 'text-primary bg-primary/10' : ''}`}>
            Italic
          </button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`px-3 py-1.5 text-sm font-medium hover:bg-muted border-l border-border/50 ${editor.isActive('strike') ? 'text-primary bg-primary/10' : ''}`}>
            Strike
          </button>
        </BubbleMenu>
      )}

      {editor && (
        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex overflow-hidden rounded-lg border border-border/50 bg-card/90 backdrop-blur-lg shadow-xl">
           <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="px-3 py-1.5 text-sm font-medium hover:bg-muted">
            H1
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="px-3 py-1.5 text-sm font-medium hover:bg-muted border-l border-border/50">
            H2
          </button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="px-3 py-1.5 text-sm font-medium hover:bg-muted border-l border-border/50">
            List
          </button>
        </FloatingMenu>
      )}

      <EditorContent editor={editor} className="cursor-text" />

      <style>{`
        /* TipTap specific CSS */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.5);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror pre {
          background: #1e1e1e;
          color: #fff;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
        }
        .ProseMirror code {
          font-family: 'JetBrains Mono', monospace;
        }
        /* TipTap Table CSS */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }
        .ProseMirror td,
        .ProseMirror th {
          min-width: 1em;
          border: 1px solid hsl(var(--border));
          padding: 3px 5px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror th {
          font-weight: bold;
          text-align: left;
          background-color: hsl(var(--muted));
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: hsl(var(--primary));
          pointer-events: none;
        }
        .ProseMirror p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
