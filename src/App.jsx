import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
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
      <Navbar />

      {/* 👇 Push content below fixed header */}
      <main className="pt-16">
         <div className="pt-16 min-h-screen bg-background">
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
        </div>
      </main>


    </BrowserRouter>
  );
}

export default App;
