import { useEffect, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2,
  List, ListOrdered, Quote, Table as TableIcon, Link as LinkIcon,
  Undo2, Redo2, Minus,
} from 'lucide-react';

import 'highlight.js/styles/github-dark.css';

const lowlight = createLowlight(common);

// ─── Toolbar Divider ──────────────────────────────────────────────────────────
const Divider = () => (
  <span className="mx-1 my-auto h-5 w-px shrink-0 bg-border/60" aria-hidden="true" />
);

// ─── Single toolbar button ────────────────────────────────────────────────────
const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={[
      'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors',
      'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-40',
      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
    ].join(' ')}
  >
    {children}
  </button>
);

// ─── Link insertion dialog ────────────────────────────────────────────────────
const LinkPopover = ({ editor, onClose }) => {
  const [url, setUrl] = useState(editor.getAttributes('link').href ?? '');

  const apply = useCallback(() => {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url.trim(), target: '_blank' }).run();
    }
    onClose();
  }, [editor, url, onClose]);

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <input
        autoFocus
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply();
          if (e.key === 'Escape') onClose();
        }}
        placeholder="https://example.com"
        className="h-7 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-52"
      />
      <button
        type="button"
        onClick={apply}
        className="h-7 rounded bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        Set
      </button>
      {editor.isActive('link') && (
        <button
          type="button"
          onClick={() => { editor.chain().focus().unsetLink().run(); onClose(); }}
          className="h-7 rounded border border-border px-2 text-xs text-muted-foreground hover:bg-muted"
        >
          Remove
        </button>
      )}
    </div>
  );
};

// ─── Toolbar ─────────────────────────────────────────────────────────────────
const Toolbar = ({ editor }) => {
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (!editor) return null;

  const groups = [
    [
      { icon: <Undo2 size={15} />, title: 'Undo (⌘Z)', onClick: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo() },
      { icon: <Redo2 size={15} />, title: 'Redo (⌘⇧Z)', onClick: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo() },
    ],
    [
      { icon: <Bold size={15} />, title: 'Bold (⌘B)', onClick: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
      { icon: <Italic size={15} />, title: 'Italic (⌘I)', onClick: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
      { icon: <Strikethrough size={15} />, title: 'Strikethrough', onClick: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
      { icon: <Code size={15} />, title: 'Inline code (⌘E)', onClick: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code') },
    ],
    [
      { icon: <Heading1 size={15} />, title: 'Heading 1', onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
      { icon: <Heading2 size={15} />, title: 'Heading 2', onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    ],
    [
      { icon: <List size={15} />, title: 'Bullet list', onClick: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
      { icon: <ListOrdered size={15} />, title: 'Ordered list', onClick: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
      { icon: <Quote size={15} />, title: 'Blockquote', onClick: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
      { icon: <Code size={15} />, title: 'Code block', onClick: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
    ],
    [
      { icon: <TableIcon size={15} />, title: 'Insert table', onClick: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), active: editor.isActive('table') },
      { icon: <Minus size={15} />, title: 'Horizontal rule', onClick: () => editor.chain().focus().setHorizontalRule().run() },
    ],
  ];

  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 border-b border-border/50 bg-card/80 backdrop-blur-md px-2 py-1.5 rounded-t-xl">
      {groups.map((group, gi) => (
        <span key={gi} className="contents">
          {group.map((btn, bi) => (
            <ToolbarButton key={bi} {...btn}>{btn.icon}</ToolbarButton>
          ))}
          {gi < groups.length - 1 && <Divider />}
        </span>
      ))}

      {/* Link button — special because it opens an inline input */}
      <Divider />
      <div className="relative flex items-center">
        <ToolbarButton
          title="Link (⌘K)"
          active={editor.isActive('link') || showLinkInput}
          onClick={() => setShowLinkInput((v) => !v)}
        >
          <LinkIcon size={15} />
        </ToolbarButton>
        {showLinkInput && (
          <div className="absolute left-0 top-full mt-1 z-20 flex rounded-lg border border-border/60 bg-popover shadow-lg">
            <LinkPopover editor={editor} onClose={() => setShowLinkInput(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Bubble menu (selection toolbar) ─────────────────────────────────────────
const BubbleToolbar = ({ editor }) => {
  const btn = (label, onClick, active) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={[
        'px-2.5 py-1 text-xs font-medium transition-colors',
        'first:rounded-l-md last:rounded-r-md',
        'border-r border-border/40 last:border-r-0',
        'hover:bg-muted',
        active ? 'bg-primary/10 text-primary' : 'text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );

  return (
    <div className="flex overflow-hidden rounded-md border border-border/50 bg-popover shadow-xl backdrop-blur-lg">
      {btn('Bold', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {btn('Italic', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {btn('Strike', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
      {btn('Code', () => editor.chain().focus().toggleCode().run(), editor.isActive('code'))}
      {btn('Link', () => {
        const url = window.prompt('URL', editor.getAttributes('link').href ?? '');
        if (url === null) return;
        url
          ? editor.chain().focus().setLink({ href: url, target: '_blank' }).run()
          : editor.chain().focus().unsetLink().run();
      }, editor.isActive('link'))}
    </div>
  );
};

// ─── Floating menu (empty-line toolbar) ──────────────────────────────────────
const FloatingToolbar = ({ editor }) => {
  const item = (label, onClick) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted border-r border-border/40 last:border-r-0 text-muted-foreground hover:text-foreground"
    >
      {label}
    </button>
  );

  return (
    <div className="flex overflow-hidden rounded-md border border-border/40 bg-popover/80 shadow-lg backdrop-blur-lg">
      {item('H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
      {item('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {item('List', () => editor.chain().focus().toggleBulletList().run())}
      {item('Quote', () => editor.chain().focus().toggleBlockquote().run())}
      {item('Code', () => editor.chain().focus().toggleCodeBlock().run())}
    </div>
  );
};

// ─── Word / char count ────────────────────────────────────────────────────────
const StatusBar = ({ editor }) => {
  if (!editor) return null;

  const text = editor.state.doc.textContent;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;

  return (
    <div className="flex items-center gap-4 border-t border-border/40 px-4 py-1.5 text-xs text-muted-foreground select-none">
      <span>{words} {words === 1 ? 'word' : 'words'}</span>
      <span>{chars} {chars === 1 ? 'character' : 'characters'}</span>
    </div>
  );
};

// ─── Main exported component ──────────────────────────────────────────────────
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className = '',
  minHeight = 400,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing, or type "/" for shortcuts…',
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none px-6 py-5',
        style: `min-height: ${minHeight}px`,
      },
      transformPastedHTML(html) {
        // Clean up styling and classes from pasted content to keep standard formatting only
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('*').forEach((el) => {
          // Keep only essential structural attributes
          const keepAttrs = ['href', 'src', 'target', 'colspan', 'rowspan', 'checked', 'disabled'];
          
          // Check for code blocks or inline code to preserve language classes
          const isCode = el.tagName === 'CODE' || el.tagName === 'PRE';
          const classList = Array.from(el.classList);
          const hasLanguageClass = classList.some(c => c.startsWith('language-'));

          Array.from(el.attributes).forEach((attr) => {
            if (attr.name === 'class' && isCode && hasLanguageClass) {
              const langClass = classList.find(c => c.startsWith('language-'));
              el.setAttribute('class', langClass);
            } else if (!keepAttrs.includes(attr.name)) {
              el.removeAttribute(attr.name);
            }
          });
        });

        return doc.body.innerHTML;
      },
    },
  });

  // Sync external changes (e.g. loading a saved draft) without fighting the user
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value ?? '');
    }
  }, [value, editor]);

  return (
    <div
      className={[
        'flex flex-col rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-inner',
        'transition-all focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50',
        className,
      ].join(' ')}
    >
      <Toolbar editor={editor} />

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 80, placement: 'top' }}>
          <BubbleToolbar editor={editor} />
        </BubbleMenu>
      )}

      {editor && (
        <FloatingMenu editor={editor} tippyOptions={{ duration: 80, placement: 'left' }}>
          <FloatingToolbar editor={editor} />
        </FloatingMenu>
      )}

      <EditorContent editor={editor} className="flex-1 cursor-text" />

      <StatusBar editor={editor} />

      <style>{`
        /* Placeholder */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.4);
          pointer-events: none;
          height: 0;
        }

        /* Code blocks */
        .ProseMirror pre {
          background: #161b22;
          color: #e6edf3;
          border-radius: 0.625rem;
          padding: 1rem 1.25rem;
          margin: 1rem 0;
          overflow-x: auto;
          font-size: 0.875em;
          line-height: 1.6;
        }
        .ProseMirror pre code {
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
          background: none;
          padding: 0;
        }

        /* Inline code */
        .ProseMirror code:not(pre code) {
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
          font-size: 0.875em;
          background: hsl(var(--muted));
          border-radius: 0.25rem;
          padding: 0.1em 0.35em;
        }

        /* Links */
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
        }
        .ProseMirror a:hover {
          opacity: 0.8;
        }

        /* Tables */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
          border-radius: 0.5rem;
        }
        .ProseMirror td,
        .ProseMirror th {
          min-width: 4em;
          border: 1px solid hsl(var(--border));
          padding: 0.4em 0.6em;
          vertical-align: top;
          position: relative;
        }
        .ProseMirror th {
          font-weight: 600;
          background: hsl(var(--muted));
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: hsl(var(--primary));
          pointer-events: none;
        }

        /* Paragraph reset */
        .ProseMirror p { margin: 0 0 0.75rem; }
        .ProseMirror p:last-child { margin-bottom: 0; }

        /* Blockquote */
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--primary) / 0.5);
          margin: 1rem 0;
          padding: 0.25rem 0 0.25rem 1rem;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }

        /* HR */
        .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5rem 0;
        }

        /* Headings */
        .ProseMirror h1 { font-size: 1.75rem; font-weight: 700; margin: 1.5rem 0 0.5rem; line-height: 1.2; }
        .ProseMirror h2 { font-size: 1.35rem; font-weight: 600; margin: 1.25rem 0 0.4rem; line-height: 1.3; }
        .ProseMirror h3 { font-size: 1.15rem; font-weight: 600; margin: 1rem 0 0.3rem; }

        /* Lists */
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin: 0.5rem 0 0.75rem; }
        .ProseMirror li { margin: 0.2rem 0; }

        /* Selected cell highlight */
        .ProseMirror .selectedCell:after {
          content: '';
          position: absolute;
          inset: 0;
          background: hsl(var(--primary) / 0.08);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}