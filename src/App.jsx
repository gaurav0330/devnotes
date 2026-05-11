import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import { NotesGridSkeleton } from "@/components/NoteSkeleton";

// 🚀 Code-split all pages — only Home is needed on first load
const Home       = lazy(() => import("@/pages/Home.jsx"));
const CreateNote = lazy(() => import("@/pages/CreateNote"));
const ViewNote   = lazy(() => import("@/pages/ViewNote"));
const EditNote   = lazy(() => import("@/pages/EditNote"));
const Login      = lazy(() => import("@/pages/Login"));
const Signup     = lazy(() => import("@/pages/Signup"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));

// Generic page fallback
function PageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-page-in">
      <div className="h-10 w-56 rounded-2xl animate-shimmer mb-8" />
      <NotesGridSkeleton />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-16 min-h-screen">
          <Suspense fallback={<PageSkeleton />}>
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
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;