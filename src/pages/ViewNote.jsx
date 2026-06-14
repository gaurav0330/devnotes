import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicNoteBySlug,
  getPrivateNoteBySlug,
  deleteNoteById,
  getSeriesNotes,
  getPublicSeriesNotes,
} from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/context/DialogContext";
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
  Clock,
  AlignLeft,
  ALargeSmall,
  Terminal,
  Eraser,
} from "lucide-react";
import PracticeScratchpad from "@/components/PracticeScratchpad";
import RichTextEditor from "@/components/RichTextEditor";
import { copyToClipboard } from "@/lib/utils";

// ✅ Native print-based PDF export — works with all CSS color functions (oklab, oklch, etc.)
// Does NOT use html2canvas so there are no compatibility issues.
function exportToPDF(contentHtml, title, showAlert) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    if (showAlert) {
      showAlert({ title: "Popups Blocked", message: "Please allow popups for this site to export PDF.", type: "warning" });
    } else {
      alert("Please allow popups for this site to export PDF.");
    }
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
  const { showConfirm, showAlert } = useDialog();

  const { data: note = null, isLoading: loading } = useQuery({
    queryKey: ["note", slug, user?.uid],
    queryFn: async () => {
      const publicNote = await getPublicNoteBySlug(slug);
      if (publicNote) {
        return { ...publicNote, visibility: "public" };
      }
      if (user) {
        const privateNote = await getPrivateNoteBySlug(user.uid, slug);
        if (privateNote) {
          return { ...privateNote, visibility: privateNote.visibility || "private" };
        }
      }
      return null;
    },
    enabled: !!slug,
  });

  const isOwner = Boolean(
    note && 
    user && 
    (note.visibility === "public" ? note.userId === user.uid : true)
  );

  const { data: seriesNotes = [] } = useQuery({
    queryKey: ["series", note?.seriesName, user?.uid, note?.visibility],
    queryFn: async () => {
      if (!note?.seriesName) return [];
      if (note.visibility === "public") {
         return await getPublicSeriesNotes(note.seriesName);
      } else if (user) {
         return await getSeriesNotes(user.uid, note.seriesName);
      }
      return [];
    },
    enabled: !!note?.seriesName,
  });

  const currentSeriesIndex = seriesNotes.findIndex(n => n.id === (note.privateNoteId || note.id) || n.id === note.id);
  const prevNote = currentSeriesIndex > 0 ? seriesNotes[currentSeriesIndex - 1] : null;
  const nextNote = currentSeriesIndex !== -1 && currentSeriesIndex < seriesNotes.length - 1 ? seriesNotes[currentSeriesIndex + 1] : null;

  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(null); // "pdf" | "md" | null

  // Scroll depth and statistics states
  const [scrollProgress, setScrollProgress] = useState(0);
  const [stats, setStats] = useState({ words: 0, time: 0 });

  // Custom typography states (persisted in localStorage)
  const [fontStyle, setFontStyle] = useState(() => localStorage.getItem("reader_font_style") || "sans");
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("reader_font_size") || "base");

  // Scratchpad states
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // Adjustable split screen width logic
  const [splitPercent, setSplitPercent] = useState(() => {
    const saved = localStorage.getItem("view_note_split_percent");
    return saved ? parseFloat(saved) : 50;
  });
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitPercentRef = useRef(splitPercent);

  useEffect(() => {
    splitPercentRef.current = splitPercent;
  }, [splitPercent]);

  const startResizeSplit = useCallback((e) => {
    e.preventDefault();
    setIsResizingSplit(true);
  }, []);

  useEffect(() => {
    if (!isResizingSplit) return;

    const handleMouseMove = (e) => {
      const container = document.getElementById("split-grid-container");
      if (container) {
        const rect = container.getBoundingClientRect();
        const clientXRelative = e.clientX - rect.left;
        const newPercent = Math.max(30, Math.min(70, (clientXRelative / rect.width) * 100));
        setSplitPercent(newPercent);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSplit(false);
      localStorage.setItem("view_note_split_percent", splitPercentRef.current.toString());
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSplit]);

  // Close typography settings when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showSettings]);

  // Persist typography choices
  useEffect(() => {
    localStorage.setItem("reader_font_style", fontStyle);
  }, [fontStyle]);

  useEffect(() => {
    localStorage.setItem("reader_font_size", fontSize);
  }, [fontSize]);

  // Calculate scroll reading depth
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute word count & reading time stats
  useEffect(() => {
    if (!note?.content) return;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = note.content;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const time = Math.max(1, Math.round(words / 200));
    setStats({ words, time });
  }, [note?.content]);
  // Handle syntax-highlighting code blocks and inject copy code buttons
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) return;
    
    // Give the DOM a tiny fraction of time to ensure innerHTML has fully painted
    const timer = setTimeout(() => {
      const preElements = contentRef.current.querySelectorAll("pre");
      console.log(`[DevNotes DEBUG] Injecting copy buttons for ${preElements.length} <pre> tags.`);
      
      preElements.forEach((pre) => {
        // Explicitly enforce relative positioning on the pre block so the absolute button aligns correctly inside it
        pre.style.position = "relative";
        
        // Remove any existing copy button to avoid duplicates
        const existingBtn = pre.querySelector(".copy-code-btn");
        if (existingBtn) existingBtn.remove();

        const button = document.createElement("button");
        button.className = "copy-code-btn";
        button.title = "Copy Code";
        button.type = "button";
        
        // Inject inline styles as a fallback just in case the CSS is missing or overridden
        button.style.position = "absolute";
        button.style.top = "0.5rem";
        button.style.right = "0.5rem";
        button.style.zIndex = "50";
        
        const copySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
        
        button.innerHTML = copySvg;
        
        button.addEventListener("click", async (e) => {
          e.stopPropagation();
          const codeElement = pre.querySelector("code");
          
          let codeText = "";
          if (codeElement) {
            codeText = codeElement.innerText;
          } else {
            const clone = pre.cloneNode(true);
            const btn = clone.querySelector(".copy-code-btn");
            if (btn) btn.remove();
            codeText = clone.innerText;
          }
          
          const success = await copyToClipboard(codeText);
          if (success) {
            button.innerHTML = checkSvg;
            button.classList.add("success");
            setTimeout(() => {
              if (document.body.contains(button)) {
                button.innerHTML = copySvg;
                button.classList.remove("success");
              }
            }, 2000);
          }
        });

        // Append the button as the last child of the <pre> tag
        pre.appendChild(button);
      });
    }, 50); // Small timeout allows React to finish DOM mutation completely

    return () => clearTimeout(timer);
  }); // Removed dependency array so it runs on every render to restore wiped buttons

  const handleDelete = async () => {
    if (!isOwner || !note || !user) return;
    const ok = await showConfirm({
      title: "Delete Note",
      message: "Are you sure you want to delete this note?",
      type: "danger"
    });
    if (!ok) return;
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
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPDF = () => {
    if (!note) return;
    setExporting("pdf");
    try {
      exportToPDF(note.content, note.title, showAlert);
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
        <Button onClick={() => navigate("/")} className="hover:scale-[1.02] active:scale-[0.98] transition-all">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back Home
        </Button>
      </div>
    );
  }

  // Map user selections to classes
  const fontClass = 
    fontStyle === "sans" 
      ? "font-sans" 
      : fontStyle === "serif" 
      ? "font-serif" 
      : "font-mono";

  const sizeClass = 
    fontSize === "sm" 
      ? "prose-sm" 
      : fontSize === "base" 
      ? "prose-base" 
      : "prose-lg";

  const seriesNavigationUI = note.seriesName && seriesNotes.length > 1 ? (
    <div className="px-6 py-3 border-y border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
      {prevNote ? (
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full sm:w-auto flex flex-col items-start h-auto py-1 px-2 gap-0.5 hover:bg-muted/50"
          onClick={() => navigate(`/note/${prevNote.slug}`)}
        >
          <span className="text-[9px] uppercase font-bold text-muted-foreground/70 tracking-wider flex items-center gap-1"><ArrowLeft className="h-2.5 w-2.5"/> Prev{prevNote.seriesOrder ? `: Part ${prevNote.seriesOrder}` : ''}</span>
          <span className="font-semibold text-foreground/80 line-clamp-1 text-xs">{prevNote.title}</span>
        </Button>
      ) : <div className="hidden sm:block w-[120px]" />}
      
      <div className="flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Series
        </span>
        <span className="text-xs font-semibold text-primary">
          {note.seriesName}
        </span>
      </div>

      {nextNote ? (
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full sm:w-auto flex flex-col items-end h-auto py-1 px-2 gap-0.5 hover:bg-muted/50 text-right"
          onClick={() => navigate(`/note/${nextNote.slug}`)}
        >
          <span className="text-[9px] uppercase font-bold text-muted-foreground/70 tracking-wider flex items-center gap-1">Next{nextNote.seriesOrder ? `: Part ${nextNote.seriesOrder}` : ''} <ArrowLeft className="h-2.5 w-2.5 rotate-180"/></span>
          <span className="font-semibold text-foreground/80 line-clamp-1 text-xs">{nextNote.title}</span>
        </Button>
      ) : <div className="hidden sm:block w-[120px]" />}
    </div>
  ) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] animate-page-in relative">

      <div className={`mx-auto p-6 transition-all duration-300 ${isScratchpadOpen ? "max-w-[95vw]" : "max-w-4xl"}`}>
        {/* Top Actions Bar (Sticky) */}
        <div className="sticky top-16 z-30 flex justify-between items-center gap-4 flex-wrap bg-background/85 backdrop-blur-md py-3.5 border-b border-border/10 mb-8 rounded-b-xl px-4 -mx-4 shadow-sm shadow-black/[0.01]">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")} 
            className="hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          <div className="flex gap-2 flex-wrap items-center justify-end">
            {/* Typography & Reader Settings */}
            <div ref={settingsRef} className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSettings(!showSettings)}
                className={`gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all ${
                  showSettings ? "bg-primary/10 text-primary border-primary/40 shadow-sm" : ""
                }`}
                title="Reader Settings"
              >
                <ALargeSmall className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-56 p-4 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-md shadow-xl z-50 animate-scale-in">
                  <div className="space-y-4">
                    {/* Font Style */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block mb-2 select-none">Font Style</label>
                      <div className="grid grid-cols-3 gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/10">
                        {["sans", "serif", "mono"].map((style) => (
                          <button
                            key={style}
                            onClick={() => setFontStyle(style)}
                            className={`py-1 text-xs font-semibold rounded capitalize transition-all cursor-pointer ${
                              fontStyle === style
                                ? "bg-card text-foreground shadow-sm font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block mb-2 select-none">Font Size</label>
                      <div className="grid grid-cols-3 gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/10">
                        {["sm", "base", "lg"].map((size) => (
                          <button
                            key={size}
                            onClick={() => setFontSize(size)}
                            className={`py-1 text-xs font-semibold rounded uppercase transition-all cursor-pointer ${
                              fontSize === size
                                ? "bg-card text-foreground shadow-sm font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export PDF */}
            <Button
              size="sm"
              variant="outline"
              disabled={exporting === "pdf"}
              onClick={handleExportPDF}
              className="gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FileDown className="h-4 w-4" />
              <span>{exporting === "pdf" ? "Exporting…" : "PDF"}</span>
            </Button>

            {/* Export Markdown */}
            <Button
              size="sm"
              variant="outline"
              disabled={exporting === "md"}
              onClick={handleExportMD}
              className="gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>{exporting === "md" ? "Exporting…" : "Markdown"}</span>
            </Button>

            {/* Practice Scratchpad Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
              className={`gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all ${
                isScratchpadOpen ? "bg-primary/10 text-primary border-primary/45 shadow-sm font-semibold" : ""
              }`}
              title="Toggle Code Practice Scratchpad"
            >
              <Terminal className="h-4 w-4" />
              <span>{isScratchpadOpen ? "Close Practice" : "Practice"}</span>
            </Button>

            {/* Copy Link */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={copyLink} 
              className={`gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all ${
                copied ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/5" : ""
              }`}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied!" : "Share Link"}</span>
            </Button>

            {isOwner && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/edit/${slug}`)} 
                  className="gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Edit className="h-4 w-4" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  disabled={deleting} 
                  onClick={handleDelete} 
                  className="gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{deleting ? "Deleting…" : "Delete"}</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Layout Wrapper */}
        <div 
          id="split-grid-container" 
          style={{
            "--split-percent": `${splitPercent}%`,
            "--split-remainder": `calc(${100 - splitPercent}% - 16px)`
          }}
          className={`w-full flex flex-col relative gap-4 items-start transition-all duration-75 ${
            isScratchpadOpen ? "lg:flex-row" : ""
          }`}
        >
          {/* Note Card */}
          <div 
            className={`border border-border/40 rounded-3xl overflow-hidden bg-card shadow-premium hover:shadow-neon/5 hover:border-primary/20 transition-all duration-300 w-full ${
              isScratchpadOpen ? "lg:w-[var(--split-percent)] lg:flex-none" : ""
            }`}
          >
          
          {/* Card Header Section */}
          <div className="p-8 border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
            
            {/* Visibility Badge */}
            <div className="mb-4">
              {note.visibility === "public" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_2px_10px_rgba(16,185,129,0.02)] select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  Public Note
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_2px_10px_rgba(245,158,11,0.02)] select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  Private Note
                </span>
              )}
            </div>

            {/* Note Title */}
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-6 leading-tight select-all">
              {note.title}
            </h1>

            {/* Note Metadata Details */}
            <div className="flex flex-wrap gap-x-5 gap-y-2.5 text-xs text-muted-foreground/80 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground/60" />
                <span>Created {formatDate(note.createdAt)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground/60" />
                <span>{stats.time} {stats.time === 1 ? "min" : "mins"} read</span>
              </div>

              <div className="flex items-center gap-1.5">
                <AlignLeft className="h-4 w-4 text-muted-foreground/60" />
                <span>{stats.words.toLocaleString()} words</span>
              </div>
            </div>

            {/* Note Tags list */}
            {note.tags?.length > 0 && (
              <div className="flex gap-2 mt-6 flex-wrap items-center">
                {note.tags.map((t, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all cursor-default select-none hover:scale-[1.02]"
                  >
                    <Tag className="h-3 w-3 opacity-60" />
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Series Navigation Header */}
          {seriesNavigationUI}

          {/* Card Body - Content */}
          <div className={`p-8 md:p-12 transition-all duration-200`} ref={contentRef}>
            <RichTextEditor 
              value={note.content} 
              readOnly={true} 
              typographyClasses={`${fontClass} ${sizeClass}`}
              onMentionClick={(id) => navigate(`/note/${id}`)}
            />
          </div>
        </div>

        {/* Split Drag Resize Divider */}
        {isScratchpadOpen && (
          <div
            onMouseDown={startResizeSplit}
            style={{ left: `${splitPercent}%` }}
            className={`
              hidden lg:block absolute top-0 bottom-0 w-2 cursor-col-resize z-30 transform -translate-x-1/2 group
              ${isResizingSplit ? "bg-primary/20" : "hover:bg-primary/10"}
            `}
            title="Drag to resize panels"
          >
            {/* Center visual grip line */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-1 rounded bg-border group-hover:bg-primary/60 group-active:bg-primary transition-colors" />
          </div>
        )}

        {/* Practice Scratchpad Side Panel */}
        {isScratchpadOpen && (
          <div 
            className="w-full lg:w-[var(--split-remainder)] lg:flex-none lg:self-stretch"
          >
            <PracticeScratchpad slug={slug} />
          </div>
        )}

      </div>
    </div>
  </div>
  );
}
