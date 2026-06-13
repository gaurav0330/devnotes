import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "@/context/AuthContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { ThemeProvider } from "@/context/ThemeProvider";
import { DialogProvider } from "@/context/DialogContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <ThemeProvider>
            <DialogProvider>
              <App />
            </DialogProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);