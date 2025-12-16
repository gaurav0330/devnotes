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
  Tag as TagIcon,
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
          setNote(publicNote);
          setIsOwner(user && publicNote.userId === user.uid);
          setLoading(false);
          return;
        }

        // If logged in, try private note
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
      } catch (error) {
        console.error("Error loading note:", error);
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
      console.error("Error deleting note:", error);
      alert("Failed to delete note. Please try again.");
      setDeleting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // Create a toast notification effect
      const toast = document.createElement("div");
      toast.className =
        "fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-up z-50";
      toast.textContent = "✓ Link copied to clipboard!";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      alert("Failed to copy link");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600 animate-pulse">Loading note...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-800">Note Not Found</h2>
          <p className="text-gray-600">
            This note doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate("/")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-6 animate-fade-in">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="hover:bg-gray-200 transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notes
          </Button>
        </div>

        {/* Note Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-6 animate-slide-up border border-gray-200">
          {/* Header */}
          <div className="space-y-4 pb-6 border-b">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {note.title}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {note.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(note.createdAt)}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {note.visibility === "public" ? (
                  <>
                    <Globe className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Private</span>
                  </>
                )}
              </div>

              {note.tags && note.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4" />
                  <div className="flex gap-2 flex-wrap">
                    {note.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div
            className="prose prose-lg max-w-none
                       prose-headings:font-bold prose-headings:text-gray-900
                       prose-h1:text-4xl prose-h1:mb-4
                       prose-h2:text-3xl prose-h2:mb-3
                       prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                       prose-ul:list-disc prose-ul:ml-6
                       prose-ol:list-decimal prose-ol:ml-6
                       prose-li:text-gray-700 prose-li:mb-2
                       prose-blockquote:border-l-4 prose-blockquote:border-blue-500
                       prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-gray-600
                       prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg
                       prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded
                       prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800
                       prose-strong:text-gray-900 prose-strong:font-bold
                       prose-em:text-gray-700 prose-em:italic"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-6 border-t">
            {note.visibility === "public" && (
              <Button
                onClick={copyLink}
                variant="outline"
                className="hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-all"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Copy Share Link
              </Button>
            )}

            {isOwner && (
              <>
                <Button
                  onClick={() => navigate(`/edit/${slug}`)}
                  className="bg-blue-600 hover:bg-blue-700 transition-all"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Note
                </Button>

                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  variant="destructive"
                  className="hover:bg-red-700 transition-all"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}