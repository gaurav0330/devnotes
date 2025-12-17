import { useEffect, useState } from "react";
import { getUserNotes } from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Globe, Lock, FileText, Search, Tag } from "lucide-react";
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

  /* NOT LOGGED IN */
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-lg p-8 animate-fade-in">
          <div className="text-7xl mb-4">📝</div>
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Welcome to DevNotes
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed">
            Your personal space for beautiful, organized notes. Write, save, and share your ideas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* LOADING */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="spinner h-12 w-12 mx-auto" />
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      </div>
    );
  }

  /* MAIN UI */
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              My Notes
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              {notes.length} {notes.length === 1 ? "note" : "notes"} in your collection
            </p>
          </div>

          <Link to="/create">
            <Button size="lg" className="gap-2 shadow-md w-full md:w-auto">
              <Plus className="h-5 w-5" />
              Create New Note
            </Button>
          </Link>
        </div>

        {/* Search */}
        {notes.length > 0 && (
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search notes by title, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-base shadow-sm"
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
                className="animate-slide-up card-hover"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="h-full bg-card border-2 border-border">
                  <CardContent className="p-6 space-y-4">
                    {/* Title */}
                    <h2 className="font-bold text-xl line-clamp-2 text-foreground min-h-[3.5rem]">
                      {note.title}
                    </h2>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="badge badge-primary">
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{note.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Preview */}
                    <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed min-h-[4.5rem]">
                      {stripHtml(note.content) || "No content"}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-border text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(note.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {note.visibility === "public" ? (
                          <>
                            <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-green-600 dark:text-green-400 font-semibold text-xs">
                              Public
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium text-xs">
                              Private
                            </span>
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
          <div className="text-center py-20 animate-fade-in">
            <Search className="h-20 w-20 text-muted-foreground/50 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              No notes found
            </h3>
            <p className="text-muted-foreground text-lg">
              Try a different search term or <Link to="/create" className="text-primary underline">create a new note</Link>.
            </p>
          </div>
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <FileText className="h-20 w-20 text-muted-foreground/50 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              No notes yet
            </h3>
            <p className="text-muted-foreground text-lg mb-8">
              Start your journey by creating your first note.
            </p>
            <Link to="/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create Your First Note
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}