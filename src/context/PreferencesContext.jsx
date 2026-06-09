import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getUserPreferences, saveUserPreferences } from "@/lib/notes.service";

const PreferencesContext = createContext();

export function PreferencesProvider({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // --- Local states (initially from localStorage) ---
  const [themeId, setThemeIdState] = useState(
    () => localStorage.getItem("app-theme-id") ?? "midnight"
  );
  const [darkMode, setDarkModeState] = useState(
    () => localStorage.getItem("app-theme-dark") !== "false"
  );
  const [sidebarOpen, setSidebarOpenState] = useState(
    () => {
      const saved = localStorage.getItem("sidebar_open_pref");
      return saved !== null ? saved !== "false" : true;
    }
  );
  const [sidebarWidth, setSidebarWidthState] = useState(
    () => {
      const saved = localStorage.getItem("sidebar_width_pref");
      return saved ? parseInt(saved, 10) : 288;
    }
  );
  const [folderSort, setFolderSortState] = useState(
    () => localStorage.getItem("folder_sort_pref") || "custom"
  );
  const [folderFilter, setFolderFilterState] = useState(
    () => localStorage.getItem("folder_filter_pref") || "all"
  );
  const [folderOrder, setFolderOrderState] = useState([]);
  const [pinnedFolders, setPinnedFoldersState] = useState([]);
  const [pinnedTrackers, setPinnedTrackersState] = useState([]);

  // Scratchpad
  const [scratchpadFontSize, setScratchpadFontSizeState] = useState(
    () => localStorage.getItem("scratchpad_font_size_pref") || "xs"
  );
  const [scratchpadShowConsole, setScratchpadShowConsoleState] = useState(
    () => localStorage.getItem("scratchpad_show_console") !== "false"
  );
  const [scratchpadConsoleHeight, setScratchpadConsoleHeightState] = useState(
    () => {
      const saved = localStorage.getItem("scratchpad_console_height_pref");
      return saved ? parseInt(saved, 10) : 176;
    }
  );
  const [glotToken, setGlotTokenState] = useState(
    () => localStorage.getItem("glot_token") || ""
  );

  // Ref to hold current layout preferences to avoid dependency-loop in useEffect/debouncer
  const currentPrefsRef = useRef({});
  useEffect(() => {
    currentPrefsRef.current = {
      themeId,
      darkMode,
      sidebarOpen,
      sidebarWidth,
      folderSort,
      folderFilter,
      folderOrder,
      pinnedFolders,
      pinnedTrackers,
      scratchpadFontSize,
      scratchpadShowConsole,
      scratchpadConsoleHeight,
      glotToken
    };
  }, [
    themeId,
    darkMode,
    sidebarOpen,
    sidebarWidth,
    folderSort,
    folderFilter,
    folderOrder,
    pinnedFolders,
    pinnedTrackers,
    scratchpadFontSize,
    scratchpadShowConsole,
    scratchpadConsoleHeight,
    glotToken
  ]);

  // Sync folder/tracker order lists with userId (since these keys are suffixed with user.uid)
  useEffect(() => {
    if (!user) {
      setFolderOrderState([]);
      setPinnedFoldersState([]);
      setPinnedTrackersState([]);
      return;
    }
    try {
      const savedOrder = localStorage.getItem(`folder_order_${user.uid}`);
      setFolderOrderState(savedOrder ? JSON.parse(savedOrder) : []);

      const savedPinnedF = localStorage.getItem(`pinned_folders_${user.uid}`);
      setPinnedFoldersState(savedPinnedF ? JSON.parse(savedPinnedF) : []);

      const savedPinnedT = localStorage.getItem(`pinned_trackers_${user.uid}`);
      setPinnedTrackersState(savedPinnedT ? JSON.parse(savedPinnedT) : []);
    } catch (e) {
      console.error("Failed parsing user local order/pin state:", e);
    }
  }, [user]);

  // --- Firestore Sync Loading effect ---
  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserPreferences(user.uid).then((remotePrefs) => {
      if (!active) return;
      if (remotePrefs) {
        // Apply remote settings to local states & localStorage
        if (remotePrefs.themeId !== undefined) {
          setThemeIdState(remotePrefs.themeId);
          localStorage.setItem("app-theme-id", remotePrefs.themeId);
        }
        if (remotePrefs.darkMode !== undefined) {
          setDarkModeState(remotePrefs.darkMode);
          localStorage.setItem("app-theme-dark", String(remotePrefs.darkMode));
        }
        if (remotePrefs.sidebarOpen !== undefined) {
          setSidebarOpenState(remotePrefs.sidebarOpen);
          localStorage.setItem("sidebar_open_pref", String(remotePrefs.sidebarOpen));
        }
        if (remotePrefs.sidebarWidth !== undefined) {
          setSidebarWidthState(remotePrefs.sidebarWidth);
          localStorage.setItem("sidebar_width_pref", String(remotePrefs.sidebarWidth));
        }
        if (remotePrefs.folderSort !== undefined) {
          setFolderSortState(remotePrefs.folderSort);
          localStorage.setItem("folder_sort_pref", remotePrefs.folderSort);
        }
        if (remotePrefs.folderFilter !== undefined) {
          setFolderFilterState(remotePrefs.folderFilter);
          localStorage.setItem("folder_filter_pref", remotePrefs.folderFilter);
        }
        if (remotePrefs.folderOrder !== undefined) {
          setFolderOrderState(remotePrefs.folderOrder);
          localStorage.setItem(`folder_order_${user.uid}`, JSON.stringify(remotePrefs.folderOrder));
        }
        if (remotePrefs.pinnedFolders !== undefined) {
          setPinnedFoldersState(remotePrefs.pinnedFolders);
          localStorage.setItem(`pinned_folders_${user.uid}`, JSON.stringify(remotePrefs.pinnedFolders));
        }
        if (remotePrefs.pinnedTrackers !== undefined) {
          setPinnedTrackersState(remotePrefs.pinnedTrackers);
          localStorage.setItem(`pinned_trackers_${user.uid}`, JSON.stringify(remotePrefs.pinnedTrackers));
        }
        if (remotePrefs.scratchpadFontSize !== undefined) {
          setScratchpadFontSizeState(remotePrefs.scratchpadFontSize);
          localStorage.setItem("scratchpad_font_size_pref", remotePrefs.scratchpadFontSize);
        }
        if (remotePrefs.scratchpadShowConsole !== undefined) {
          setScratchpadShowConsoleState(remotePrefs.scratchpadShowConsole);
          localStorage.setItem("scratchpad_show_console", String(remotePrefs.scratchpadShowConsole));
        }
        if (remotePrefs.scratchpadConsoleHeight !== undefined) {
          setScratchpadConsoleHeightState(remotePrefs.scratchpadConsoleHeight);
          localStorage.setItem("scratchpad_console_height_pref", String(remotePrefs.scratchpadConsoleHeight));
        }
        if (remotePrefs.glotToken !== undefined) {
          setGlotTokenState(remotePrefs.glotToken);
          localStorage.setItem("glot_token", remotePrefs.glotToken);
        }
      } else {
        // New user or no remote preferences: seed Firestore with current local settings
        saveUserPreferences(user.uid, currentPrefsRef.current);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  // --- Firestore Cloud Save Debouncer ---
  const saveTimeoutRef = useRef(null);
  const triggerCloudSave = () => {
    if (!user) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveUserPreferences(user.uid, currentPrefsRef.current);
    }, 1000); // 1-second debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // --- Layout Preferences Setters (Synchronous Local, Debounced Cloud) ---
  const setThemeId = (val) => {
    setThemeIdState(val);
    localStorage.setItem("app-theme-id", val);
    currentPrefsRef.current.themeId = val;
    triggerCloudSave();
  };

  const setDarkMode = (val) => {
    setDarkModeState(val);
    localStorage.setItem("app-theme-dark", String(val));
    currentPrefsRef.current.darkMode = val;
    triggerCloudSave();
  };

  const toggleDarkMode = () => {
    setDarkModeState((prev) => {
      const next = !prev;
      localStorage.setItem("app-theme-dark", String(next));
      currentPrefsRef.current.darkMode = next;
      return next;
    });
    triggerCloudSave();
  };

  const setSidebarOpen = (val) => {
    setSidebarOpenState(val);
    localStorage.setItem("sidebar_open_pref", String(val));
    currentPrefsRef.current.sidebarOpen = val;
    triggerCloudSave();
  };

  const toggleSidebar = () => {
    setSidebarOpenState((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_open_pref", String(next));
      currentPrefsRef.current.sidebarOpen = next;
      return next;
    });
    triggerCloudSave();
  };

  const setSidebarWidth = (val) => {
    setSidebarWidthState(val);
    localStorage.setItem("sidebar_width_pref", String(val));
    currentPrefsRef.current.sidebarWidth = val;
    triggerCloudSave();
  };

  const setFolderSort = (val) => {
    setFolderSortState(val);
    localStorage.setItem("folder_sort_pref", val);
    currentPrefsRef.current.folderSort = val;
    triggerCloudSave();
  };

  const setFolderFilter = (val) => {
    setFolderFilterState(val);
    localStorage.setItem("folder_filter_pref", val);
    currentPrefsRef.current.folderFilter = val;
    triggerCloudSave();
  };

  const setFolderOrder = (val) => {
    setFolderOrderState((prev) => {
      const updated = typeof val === "function" ? val(prev) : val;
      if (user) {
        localStorage.setItem(`folder_order_${user.uid}`, JSON.stringify(updated));
      }
      currentPrefsRef.current.folderOrder = updated;
      return updated;
    });
    triggerCloudSave();
  };

  const setPinnedFolders = (val) => {
    setPinnedFoldersState((prev) => {
      const updated = typeof val === "function" ? val(prev) : val;
      if (user) {
        localStorage.setItem(`pinned_folders_${user.uid}`, JSON.stringify(updated));
      }
      currentPrefsRef.current.pinnedFolders = updated;
      return updated;
    });
    triggerCloudSave();
  };

  const setPinnedTrackers = (val) => {
    setPinnedTrackersState((prev) => {
      const updated = typeof val === "function" ? val(prev) : val;
      if (user) {
        localStorage.setItem(`pinned_trackers_${user.uid}`, JSON.stringify(updated));
      }
      currentPrefsRef.current.pinnedTrackers = updated;
      return updated;
    });
    triggerCloudSave();
  };

  const setScratchpadFontSize = (val) => {
    setScratchpadFontSizeState(val);
    localStorage.setItem("scratchpad_font_size_pref", val);
    currentPrefsRef.current.scratchpadFontSize = val;
    triggerCloudSave();
  };

  const setScratchpadShowConsole = (val) => {
    setScratchpadShowConsoleState(val);
    localStorage.setItem("scratchpad_show_console", String(val));
    currentPrefsRef.current.scratchpadShowConsole = val;
    triggerCloudSave();
  };

  const setScratchpadConsoleHeight = (val) => {
    setScratchpadConsoleHeightState(val);
    localStorage.setItem("scratchpad_console_height_pref", String(val));
    currentPrefsRef.current.scratchpadConsoleHeight = val;
    triggerCloudSave();
  };

  const setGlotToken = (val) => {
    setGlotTokenState(val);
    localStorage.setItem("glot_token", val);
    currentPrefsRef.current.glotToken = val;
    triggerCloudSave();
  };

  return (
    <PreferencesContext.Provider
      value={{
        loading,
        themeId,
        setThemeId,
        darkMode,
        setDarkMode,
        toggleDarkMode,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        sidebarWidth,
        setSidebarWidth,
        folderSort,
        setFolderSort,
        folderFilter,
        setFolderFilter,
        folderOrder,
        setFolderOrder,
        pinnedFolders,
        setPinnedFolders,
        pinnedTrackers,
        setPinnedTrackers,
        scratchpadFontSize,
        setScratchpadFontSize,
        scratchpadShowConsole,
        setScratchpadShowConsole,
        scratchpadConsoleHeight,
        setScratchpadConsoleHeight,
        glotToken,
        setGlotToken,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
