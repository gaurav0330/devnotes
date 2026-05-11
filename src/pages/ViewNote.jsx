import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getPublicNoteBySlug,
  getPrivateNoteBySlug,
  deleteNoteById,
} from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar,
  Globe,
  Lock,
  Check,
  Tag,
  FileDown,
  FileText,
  Copy,
} from "lucide-react";

// ✅ Native print-based PDF export — works with all CSS color functions (oklab, oklch, etc.)
// Does NOT use html2canvas so there are no compatibility issues.
function exportToPDF(contentHtml, title) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    alert("Please allow popups for this site to export PDF.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title || "Note"}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          line-height: 1.8;
          color: #111827;
          background: #fff;
          padding: 48px;
          max-width: 860px;
          margin: 0 auto;
        }
        h1.note-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 12px;
          color: #111;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 12px;
        }
        .note-meta {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 32px;
        }
        h1, h2, h3, h4 { font-weight: 700; margin: 1.5em 0 0.5em; color: #111; }
        h1 { font-size: 1.6em; } h2 { font-size: 1.4em; } h3 { font-size: 1.2em; }
        p { margin-bottom: 1em; }
        ul, ol { margin: 0.5em 0 1em 1.5em; }
        li { margin-bottom: 0.25em; }
        code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
          color: #6366f1;
        }
        pre {
          background: #1e1e2e;
          color: #cdd6f4;
          padding: 1.25em;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1em 0;
          font-size: 0.85em;
        }
        pre code { background: none; color: inherit; padding: 0; }
        blockquote {
          border-left: 4px solid #6366f1;
          padding: 0.5em 1em;
          color: #6b7280;
          font-style: italic;
          margin: 1em 0;
          background: #f9fafb;
        }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; }
        a { color: #6366f1; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1 class="note-title">${title || "Note"}</h1>
      <p class="note-meta">Exported from DevNotes · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      ${contentHtml}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for fonts to load then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 600);
}


async function exportToMarkdown(html, title) {
  const { default: TurndownService } = await import("turndown");
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  const md = `# ${title}\n\n${td.turndown(html)}`;
  const blob = new Blob([md], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title || "note"}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] animate-page-in">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex justify-between mb-6">
          <div className="h-10 w-24 rounded-xl animate-shimmer" />
          <div className="flex gap-2">
            <div className="h-10 w-20 rounded-xl animate-shimmer" />
            <div className="h-10 w-20 rounded-xl animate-shimmer" />
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-8 border-b space-y-4 bg-muted/30">
            <div className="h-9 w-3/4 rounded-xl animate-shimmer" />
            <div className="flex gap-4">
              <div className="h-5 w-32 rounded-md animate-shimmer" />
              <div className="h-5 w-20 rounded-md animate-shimmer" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-md animate-shimmer" />
              <div className="h-6 w-16 rounded-md animate-shimmer" />
            </div>
          </div>
          <div className="p-8 space-y-3">
            {[100, 90, 95, 80, 85, 70].map((w, i) => (
              <div key={i} className={`h-4 rounded-md animate-shimmer`} style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ViewNote() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(null); // "pdf" | "md" | null

  useEffect(() => {
    const loadNote = async () => {
      try {
        const publicNote = await getPublicNoteBySlug(slug);
        if (publicNote) {
          setNote({ ...publicNote, visibility: "public" });
          setIsOwner(Boolean(user && publicNote.userId === user.uid));
          setLoading(false);
          return;
        }

        if (user) {
          const privateNote = await getPrivateNoteBySlug(user.uid, slug);
          if (privateNote) {
            setNote({ ...privateNote, visibility: privateNote.visibility || "private" });
            setIsOwner(true);
            setLoading(false);
            return;
          }
        }

        setNote(null);
      } catch (err) {
        console.error(err);
        setNote(null);
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [slug, user]);

  const handleDelete = async () => {
    if (!isOwner || !note || !user) return;
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    setDeleting(true);
    try {
      await deleteNoteById(user.uid, note.privateNoteId || note.id);
      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
      setDeleting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleExportPDF = () => {
    if (!note) return;
    setExporting("pdf");
    try {
      exportToPDF(note.content, note.title);
    } finally {
      setExporting(null);
    }
  };

  const handleExportMD = async () => {
    if (!note) return;
    setExporting("md");
    try {
      await exportToMarkdown(note.content, note.title);
    } finally {
      setExporting(null);
    }
  };

  const formatDate = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

  if (loading) return <ViewSkeleton />;

  if (!note) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 animate-page-in">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-2xl font-bold">Note Not Found</h2>
        <p className="text-muted-foreground">This note doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] animate-page-in">
      <div className="max-w-4xl mx-auto p-6">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          <div className="flex gap-2 flex-wrap justify-end">
            {/* Export buttons — available to everyone */}
            <Button
              size="sm"
              variant="outline"
              disabled={exporting === "pdf"}
              onClick={handleExportPDF}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              {exporting === "pdf" ? "Exporting…" : "PDF"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={exporting === "md"}
              onClick={handleExportMD}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {exporting === "md" ? "Exporting…" : "Markdown"}
            </Button>

            {/* Share link */}
            <Button size="sm" variant="outline" onClick={copyLink} className="gap-2">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>

            {isOwner && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(`/edit/${slug}`)} className="gap-2">
                  <Edit className="h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Note Card */}
        <div className="border border-border/50 rounded-3xl overflow-hidden bg-card shadow-xl shadow-black/5">
          {/* Header */}
          <div className="p-8 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-5">{note.title}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(note.createdAt)}
              </div>

              {note.visibility === "public" ? (
                <div className="flex items-center gap-1.5 text-green-500 font-medium">
                  <Globe className="h-4 w-4" /> Public
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4" /> Private
                </div>
              )}
            </div>

            {/* Tags */}
            {note.tags?.length > 0 && (
              <div className="flex gap-2 mt-5 flex-wrap items-center">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                {note.tags.map((t, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8 prose dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: note.content }} />
          </div>
        </div>
      </div>
    </div>
  );
}
