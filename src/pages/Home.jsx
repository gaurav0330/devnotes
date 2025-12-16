import { useEffect, useState } from "react";
import { getUserNotes } from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Calendar,
  Globe,
  Lock,
  FileText,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    getUserNotes(user.uid)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      stripHtml(note.content).toLowerCase().includes(query) ||
      (note.tags && note.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  });

  /* ======================
     NOT LOGGED IN
  ====================== */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md p-8 animate-fade-in">
          <div className="text-6xl">📝</div>
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to DevNotes
          </h1>
          <p className="text-muted-foreground text-lg">
            Your personal space for beautiful, organized notes.
          </p>
          <Link to="/login">
            <Button size="lg" className="mt-4">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ======================
     LOADING
  ====================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      </div>
    );
  }

  /* ======================
     MAIN UI
  ====================== */
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              My Notes
            </h1>
            <p className="text-muted-foreground">
              {notes.length} {notes.length === 1 ? "note" : "notes"} total
            </p>
          </div>

          <Link to="/create">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create New Note
            </Button>
          </Link>
        </div>

        {/* Search */}
        {notes.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search notes by title, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        )}

        {/* Notes Grid */}
        {filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note, index) => (
              <Link
                key={note.id}
                to={`/note/${note.slug}`}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="h-full bg-card text-card-foreground border border-border hover:shadow-xl transition">
                  <CardContent className="p-6 space-y-3">
                    {/* Title */}
                    <h2 className="font-bold text-xl line-clamp-2 text-foreground">
                      {note.title}
                    </h2>

                    {/* Preview */}
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {stripHtml(note.content)}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(note.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {note.visibility === "public" ? (
                          <>
                            <Globe className="h-3 w-3 text-primary" />
                            <span className="text-primary font-medium">
                              Public
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            <span>Private</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground">
              No notes found
            </h3>
            <p className="text-muted-foreground">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground">
              No notes yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start creating your first note.
            </p>
            <Link to="/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Note
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
