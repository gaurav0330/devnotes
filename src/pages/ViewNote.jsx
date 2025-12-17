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
        // 1️⃣ Try public note first
        const publicNote = await getPublicNoteBySlug(slug);
        if (publicNote) {
          setNote({
            ...publicNote,
            visibility: "public",
          });
          setIsOwner(Boolean(user && publicNote.userId === user.uid));
          setLoading(false);
          return;
        }

        // 2️⃣ Try private note (owner only)
        if (user) {
          const privateNote = await getPrivateNoteBySlug(user.uid, slug);
          if (privateNote) {
            setNote({
              ...privateNote,
              visibility: privateNote.visibility || "private",
            });
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

  /* ----------------------------------------
     DELETE NOTE (FIXED)
  ---------------------------------------- */
  const handleDelete = async () => {
    if (!isOwner || !note || !user) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this note? This action cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      // 🔥 CRITICAL FIX
      const privateNoteId = note.privateNoteId || note.id;

      await deleteNoteById(user.uid, privateNoteId);

      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
      alert("Failed to delete note.");
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Loading note...</p>
      </div>
    );
  }

  /* NOT FOUND */
  if (!note) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold">Note Not Found</h2>
        <Button className="mt-4" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back Home
        </Button>
      </div>
    );
  }

  /* MAIN VIEW */
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {isOwner && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/edit/${slug}`)}
              >
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

        {/* Card */}
        <div className="border rounded-xl overflow-hidden">
          <div className="p-6 border-b bg-muted/30">
            <h1 className="text-3xl font-bold mb-4">{note.title}</h1>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(note.createdAt)}
              </div>

              {note.visibility === "public" ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Globe className="h-4 w-4" /> Public
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Private
                </div>
              )}

              {isOwner && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Your note
                </div>
              )}
            </div>

            {/* Tags */}
            {note.tags?.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                <Tag className="h-4 w-4" />
                {note.tags.map((t, i) => (
                  <span key={i} className="badge badge-primary">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Share */}
            {note.visibility === "public" && (
              <div className="mt-6 flex items-center gap-3">
                <code className="text-sm flex-1 truncate">
                  {window.location.href}
                </code>
                <Button size="sm" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 prose dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: note.content }} />
          </div>
        </div>
      </div>
    </div>
  );
}
