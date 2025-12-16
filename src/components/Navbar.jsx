import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, LogIn, FileText, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background shadow-sm">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <FileText className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            DevNotes
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <Link to="/create">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </Link>
          )}

          {user ? (
            <Button size="sm" variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="outline">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            </Link>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-md hover:bg-muted transition"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}