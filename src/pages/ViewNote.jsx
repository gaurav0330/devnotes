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
  User,
} from "lucide-react";

export default function ViewNote() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadNote = async () => {
      try {
        // Try public note first
        const publicNote = await getPublicNoteBySlug(slug);
        if (publicNote) {
          setNote({ ...publicNote, visibility: "public" });
          setIsOwner(user && publicNote.userId === user.uid);
          setLoading(false);
          return;
        }

        // Try private note if logged in
        if (user) {
          const privateNote = await getPrivateNoteBySlug(user.uid, slug);
          if (privateNote) {
            setNote(privateNote);
            setIsOwner(true);
            setLoading(false);
            return;
          }
        }

        setNote(null);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setNote(null);
        setLoading(false);
      }
    };

    loadNote();
  }, [slug, user]);

  const handleDelete = async () => {
    if (!isOwner || !note) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this note? This action cannot be undone."
    );
    
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteNoteById(user.uid, note.id);
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Failed to delete note. Please try again.");
      setDeleting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Failed to copy link");
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

  /* LOADING */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="spinner h-12 w-12 mx-auto" />
          <p className="text-muted-foreground">Loading note...</p>
        </div>
      </div>
    );
  }

  /* NOT FOUND */
  if (!note) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-background animate-fade-in">
        <div className="text-center space-y-4 max-w-md p-8">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-3xl font-bold text-foreground">
            Note Not Found
          </h2>
          <p className="text-muted-foreground text-lg">
            This note doesn't exist or you don't have permission to view it.
          </p>
          <Button size="lg" onClick={() => navigate("/")} className="mt-6">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  /* MAIN VIEW */
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
        {/* Top Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Quick Actions (Owner Only) */}
          {isOwner && (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate(`/edit/${slug}`)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {deleting ? "Deleting..." : "Delete"}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="rounded-xl border-2 border-border bg-card shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="border-b border-border bg-muted/30 p-6 md:p-8 space-y-4">
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight break-words">
              {note.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(note.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2">
                {note.visibility === "public" ? (
                  <>
                    <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      Public
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">
                      Private
                    </span>
                  </>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Your note</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {note.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="badge badge-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Share Link Box */}
            {note.visibility === "public" && (
              <div className="mt-6 p-4 rounded-lg border border-border bg-background/50">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">
                      Share this note:
                    </p>
                    <p className="text-sm font-mono text-foreground break-all">
                      {window.location.href}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={copyLink}
                    variant={copied ? "default" : "outline"}
                    className="gap-2 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 md:p-10">
            <div
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
          </div>

          {/* Bottom Actions (Owner Only - Desktop) */}
          {isOwner && (
            <div className="border-t border-border bg-muted/30 p-6 hidden md:flex gap-3">
              <Button 
                onClick={() => navigate(`/edit/${slug}`)}
                size="lg"
                className="gap-2"
              >
                <Edit className="h-5 w-5" />
                Edit Note
              </Button>

              <Button
                variant="destructive"
                size="lg"
                disabled={deleting}
                onClick={handleDelete}
                className="gap-2"
              >
                {deleting ? (
                  <>
                    <div className="spinner h-5 w-5" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-5 w-5" />
                    Delete Note
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Info Footer */}
        {!isOwner && note.visibility === "public" && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>This is a public note shared with you</p>
          </div>
        )}
      </div>
    </div>
  );
}