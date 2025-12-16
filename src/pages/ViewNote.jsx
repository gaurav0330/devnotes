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
} from "lucide-react";

export default function ViewNote() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

    if (!window.confirm("Delete this note permanently?")) return;

    setDeleting(true);
    try {
      await deleteNoteById(user.uid, note.id);
      navigate("/");
    } catch {
      alert("Failed to delete note");
      setDeleting(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  const formatDate = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

  /* =====================
     LOADING / ERROR
  ===================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold text-foreground">
          Note Not Found
        </h2>
        <Button className="mt-4" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Home
        </Button>
      </div>
    );
  }

  /* =====================
     MAIN VIEW
  ===================== */
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Back */}
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Card */}
        <div className="mt-6 rounded-2xl border border-border bg-card text-card-foreground shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-6 space-y-3">
            <h1 className="text-4xl font-bold text-foreground">
              {note.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(note.createdAt)}
              </div>

              <div className="flex items-center gap-2">
                {note.visibility === "public" ? (
                  <>
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-primary font-medium">
                      Public
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Private</span>
                  </>
                )}
              </div>
            </div>

            {/* Share box */}
            {note.visibility === "public" && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-muted flex flex-col sm:flex-row gap-3 justify-between">
                <span className="text-sm text-muted-foreground break-all">
                  {window.location.href}
                </span>
                <Button size="sm" onClick={copyLink}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />

          {/* Actions */}
          {isOwner && (
            <div className="flex gap-3 pt-6 border-t border-border">
              <Button onClick={() => navigate(`/edit/${slug}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>

              <Button
                variant="destructive"
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
