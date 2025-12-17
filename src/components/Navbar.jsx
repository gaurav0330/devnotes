import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, LogIn, FileText, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar-fixed h-16">
      <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
        >
          <FileText className="h-6 w-6 text-primary" />
          <span className="gradient-text hidden sm:inline">
            DevNotes
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user && (
            <Link to="/create">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </Link>
          )}

          {user ? (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="outline" className="gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            </Link>
          )}

          {/* Theme Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 p-0"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}