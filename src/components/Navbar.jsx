import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Plus, LogOut, LogIn, FileText } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/90">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
        >
          <FileText className="h-7 w-7 text-blue-600" />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            DevNotes
          </span>
        </Link>

        <div className="flex gap-3 items-center">
          {user && (
            <Link to="/create">
              <Button className="bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105">
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </Link>
          )}

          {user ? (
            <Button
              variant="outline"
              onClick={logout}
              className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="outline" className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}