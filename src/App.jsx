import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home/Home";
import CreateNote from "@/pages/CreateNote";
import ViewNote from "@/pages/ViewNote";
import EditNote from "@/pages/EditNote";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        {/* Main content with proper spacing */}
        <main className="pt-16 min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreateNote />
                </ProtectedRoute>
              }
            />

            <Route
              path="/edit/:slug"
              element={
                <ProtectedRoute>
                  <EditNote />
                </ProtectedRoute>
              }
            />

            <Route path="/note/:slug" element={<ViewNote />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;