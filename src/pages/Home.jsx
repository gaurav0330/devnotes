import { useEffect, useState } from "react";
import { getUserNotes } from "@/lib/notes.service";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Calendar,
  Tag,
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center space-y-6 animate-fade-in max-w-md p-8">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to DevNotes
          </h1>
          <p className="text-gray-600 text-lg">
            Your personal space for beautiful, organized notes with rich text
            formatting.
          </p>
          <Link to="/login">
            <Button size="lg" className="mt-6 bg-blue-600 hover:bg-blue-700">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600 animate-pulse">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-down">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Notes</h1>
            <p className="text-gray-600">
              {notes.length} {notes.length === 1 ? "note" : "notes"} total
            </p>
          </div>

          <Link to="/create">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Note
            </Button>
          </Link>
        </div>

        {/* Search Bar */}
        {notes.length > 0 && (
          <div className="relative animate-slide-down" style={{ animationDelay: "100ms" }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search notes by title, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
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
                className="group animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 hover:border-blue-500 bg-white">
                  <CardContent className="p-6 space-y-3">
                    {/* Title */}
                    <h2 className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {note.title}
                    </h2>

                    {/* Content Preview */}
                    <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                      {stripHtml(note.content)}
                    </p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {note.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs text-gray-500 self-center">
                            +{note.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(note.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {note.visibility === "public" ? (
                          <>
                            <Globe className="h-3 w-3 text-green-600" />
                            <span className="text-green-600 font-medium">
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
          <div className="text-center py-16 animate-fade-in">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No notes found
            </h3>
            <p className="text-gray-500">
              Try a different search term or create a new note.
            </p>
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No notes yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start creating your first note to see it here.
            </p>
            <Link to="/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
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