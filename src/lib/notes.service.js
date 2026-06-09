import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import LZString from "lz-string";

// ─── Cache and HTML stripping helpers ─────────────────────────────────────────
export const noteCache = new Map();

export const prefetchNote = async (userId, slug, visibility) => {
  const cacheKey = `${userId || "public"}_${slug}`;
  if (noteCache.has(cacheKey)) return;

  try {
    let fetchPromise;
    if (visibility === "public") {
      fetchPromise = getPublicNoteBySlug(slug);
    } else if (userId) {
      fetchPromise = getPrivateNoteBySlug(userId, slug);
    }
    if (fetchPromise) {
      noteCache.set(cacheKey, fetchPromise);
      setTimeout(() => noteCache.delete(cacheKey), 5 * 60 * 1000); // 5 min expiry
    }
  } catch (err) {
    console.error("Prefetch failed:", err);
  }
};

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};


/* ===============================
   FOLDER METHODS (NEW)
================================ */

// Create folder
export const createFolder = async (userId, name) => {
  if (!name.trim()) throw new Error("Folder name required");

  await addDoc(collection(db, "users", userId, "folders"), {
    name: name.trim(),
    createdAt: Date.now(),
  });
};

// Rename/Update folder name
export const updateFolder = async (userId, folderId, name) => {
  if (!name.trim()) throw new Error("Folder name required");

  await updateDoc(doc(db, "users", userId, "folders", folderId), {
    name: name.trim(),
  });
};

// Get folders
export const getUserFolders = async (userId) => {
  const snap = await getDocs(collection(db, "users", userId, "folders"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Move note to folder
export const moveNoteToFolder = async (userId, noteId, folderId) => {
  await updateDoc(doc(db, "users", userId, "notes", noteId), {
    folderId: folderId ?? null,
    updatedAt: Date.now(),
  });
};

/* ---------------------------------------------------
   COMPRESSION HELPERS
--------------------------------------------------- */

// Compress HTML safely for Firestore
const compressContent = (content) => {
  if (!content) return "";
  return LZString.compressToUTF16(content);
};

// Decompress safely (backward compatible)
const decompressContent = (content, isCompressed) => {
  if (!content) return "";
  if (!isCompressed) return content;

  const decompressed = LZString.decompressFromUTF16(content);
  return decompressed ?? "";
};

// Optional safety check (after compression)
const MAX_FIRESTORE_BYTES = 900_000;
const isTooLarge = (value) =>
  new Blob([value]).size > MAX_FIRESTORE_BYTES;

/* ---------------------------------------------------
   HELPER: Generate unique slug
--------------------------------------------------- */
const generateSlug = (title) => {
  const baseSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
};

/* ---------------------------------------------------
   CREATE NOTE
--------------------------------------------------- */
export const createNote = async ({
  title,
  content,
  tags = [],
  userId,
  visibility,
}) => {
  try {
    const cleanTitle = title.trim();
    if (!cleanTitle) throw new Error("Title is required");

    const slug = generateSlug(cleanTitle);

    // 🔒 Compress content
    const compressedContent = compressContent(content);

    if (isTooLarge(compressedContent)) {
      throw new Error("Note is too large to save. Please shorten it.");
    }

    const previewText = stripHtml(content).substring(0, 200);

    // Create private note
    const privateRef = collection(db, "users", userId, "notes");
    const privateDoc = await addDoc(privateRef, {
      title: cleanTitle,
      content: compressedContent,
      isCompressed: true,
      previewText,
      slug,
      tags: tags.filter((t) => t.trim()),
      visibility,
      folderId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create public copy if needed
    if (visibility === "public") {
      await addDoc(collection(db, "publicNotes"), {
        privateNoteId: privateDoc.id,
        userId,
        title: cleanTitle,
        content: compressedContent,
        isCompressed: true,
        previewText,
        slug,
        tags: tags.filter((t) => t.trim()),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return slug;
  } catch (error) {
    console.error("Error creating note:", error);
    throw error;
  }
};

/* ---------------------------------------------------
   READ: USER NOTES (HOME PAGE)
--------------------------------------------------- */
export const getUserNotes = async (userId) => {
  try {
    const snap = await getDocs(collection(db, "users", userId, "notes"));

    const notes = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        content: data.previewText ?? decompressContent(data.content, data.isCompressed),
      };
    });

    return notes
      .filter((n) => n.type !== "tracker" && n.type !== "preferences")
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error("Error fetching user notes:", error);
    throw error;
  }
};

/* ---------------------------------------------------
   READ: PUBLIC NOTE BY SLUG
--------------------------------------------------- */
export const getPublicNoteBySlug = async (slug) => {
  const cacheKey = `public_${slug}`;
  if (noteCache.has(cacheKey)) {
    return noteCache.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const q = query(collection(db, "publicNotes"), where("slug", "==", slug));
      const snap = await getDocs(q);

      if (snap.empty) return null;

      const docSnap = snap.docs[0];
      const data = docSnap.data();

      return {
        id: docSnap.id,
        ...data,
        content: decompressContent(data.content, data.isCompressed),
      };
    } catch (error) {
      console.error("Error fetching public note:", error);
      throw error;
    }
  })();

  noteCache.set(cacheKey, promise);
  setTimeout(() => noteCache.delete(cacheKey), 5 * 60 * 1000);
  return promise;
};

/* ---------------------------------------------------
   READ: PRIVATE NOTE BY SLUG
   --------------------------------------------------- */
export const getPrivateNoteBySlug = async (userId, slug) => {
  const cacheKey = `${userId || "private"}_${slug}`;
  if (noteCache.has(cacheKey)) {
    return noteCache.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const q = query(
        collection(db, "users", userId, "notes"),
        where("slug", "==", slug)
      );
      const snap = await getDocs(q);

      if (snap.empty) return null;

      const docSnap = snap.docs[0];
      const data = docSnap.data();

      return {
        id: docSnap.id,
        ...data,
        content: decompressContent(data.content, data.isCompressed),
      };
    } catch (error) {
      console.error("Error fetching private note:", error);
      throw error;
    }
  })();

  noteCache.set(cacheKey, promise);
  setTimeout(() => noteCache.delete(cacheKey), 5 * 60 * 1000);
  return promise;
};

/* ---------------------------------------------------
   UPDATE NOTE (PRIVATE + PUBLIC SYNC)
--------------------------------------------------- */
export const updateNote = async ({
  userId,
  noteId,
  title,
  content,
  tags = [],
  visibility,
  folderId
}) => {
  try {
    const cleanTitle = title.trim();
    if (!cleanTitle) throw new Error("Title is required");

    const compressedContent = compressContent(content);

    if (isTooLarge(compressedContent)) {
      throw new Error("Note is too large to update. Please shorten it.");
    }

    // Clear memory cache to prevent stale data
    noteCache.clear();

    const previewText = stripHtml(content).substring(0, 200);

    // Update private note
    const privateRef = doc(db, "users", userId, "notes", noteId);
    await updateDoc(privateRef, {
      title: cleanTitle,
      content: compressedContent,
      isCompressed: true,
      previewText,
      tags: tags.filter((t) => t.trim()),
      visibility,
      folderId: folderId ?? null,
      updatedAt: Date.now(),
    });

    // Handle public copy
    const publicQ = query(
      collection(db, "publicNotes"),
      where("privateNoteId", "==", noteId)
    );
    const snap = await getDocs(publicQ);

    if (!snap.empty) {
      const publicRef = doc(db, "publicNotes", snap.docs[0].id);

      if (visibility === "public") {
        await updateDoc(publicRef, {
          title: cleanTitle,
          content: compressedContent,
          isCompressed: true,
          previewText,
          tags: tags.filter((t) => t.trim()),
          updatedAt: Date.now(),
        });
      } else {
        await deleteDoc(publicRef);
      }
    } else if (visibility === "public") {
      // Create public copy if switching to public
      const privateDocRef = doc(db, "users", userId, "notes", noteId);
      const privateDocSnap = await getDoc(privateDocRef);

      const slug =
        privateDocSnap.exists() ? privateDocSnap.data().slug : generateSlug(cleanTitle);

      await addDoc(collection(db, "publicNotes"), {
        privateNoteId: noteId,
        userId,
        title: cleanTitle,
        content: compressedContent,
        isCompressed: true,
        previewText,
        slug,
        tags: tags.filter((t) => t.trim()),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
};

/* ---------------------------------------------------
   SOFT DELETE NOTE (MOVE TO TRASH)
--------------------------------------------------- */
export const deleteNoteById = async (userId, noteId) => {
  if (!userId || !noteId) {
    throw new Error("Missing userId or noteId");
  }

  try {
    const privateRef = doc(db, "users", userId, "notes", noteId);
    await updateDoc(privateRef, {
      deletedAt: Date.now(),
      folderId: "trash" // Move to trash virtually
    });

    // If it's public, remove the public copy immediately for privacy
    const q = query(
      collection(db, "publicNotes"),
      where("privateNoteId", "==", noteId)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      await deleteDoc(doc(db, "publicNotes", snap.docs[0].id));
      await updateDoc(privateRef, { visibility: "private" });
    }
  } catch (error) {
    console.error("Error moving note to trash:", error);
    throw error;
  }
};

/* ---------------------------------------------------
   RESTORE NOTE FROM TRASH
--------------------------------------------------- */
export const restoreNoteById = async (userId, noteId) => {
  if (!userId || !noteId) throw new Error("Missing userId or noteId");
  
  try {
    await updateDoc(doc(db, "users", userId, "notes", noteId), {
      deletedAt: null,
      folderId: null // Move back to unfiled
    });
  } catch (error) {
    console.error("Error restoring note:", error);
    throw error;
  }
};

/* ---------------------------------------------------
   HARD DELETE NOTE (PERMANENT)
--------------------------------------------------- */
export const hardDeleteNoteById = async (userId, noteId) => {
  if (!userId || !noteId) throw new Error("Missing userId or noteId");

  try {
    await deleteDoc(doc(db, "users", userId, "notes", noteId));
  } catch (error) {
    console.error("Error permanently deleting note:", error);
    throw error;
  }
};

/* ===============================
   FOLDER DELETE (SAFE)
================================ */

export const deleteFolder = async (userId, folderId) => {
  if (!userId || !folderId) throw new Error("Missing data");

  // 1️⃣ Move all notes to Unfiled
  const notesSnap = await getDocs(
    query(
      collection(db, "users", userId, "notes"),
      where("folderId", "==", folderId)
    )
  );

  const updates = notesSnap.docs.map((d) =>
    updateDoc(doc(db, "users", userId, "notes", d.id), {
      folderId: null,
      updatedAt: Date.now(),
    })
  );

  await Promise.all(updates);

  // 2️⃣ Delete folder
  await deleteDoc(doc(db, "users", userId, "folders", folderId));
};

/* ===============================
   PINNING (NEW)
================================ */

export const togglePinNote = async (userId, noteId, currentPinned) => {
  if (!userId || !noteId) throw new Error("Missing data");
  
  await updateDoc(doc(db, "users", userId, "notes", noteId), {
    isPinned: !currentPinned,
    updatedAt: Date.now(),
  });
};

/* ===============================
   TRACKERS METHODS (NEW)
================================ */

// Fetch all trackers for a user
export const getUserTrackers = async (userId) => {
  if (!userId) throw new Error("Missing userId");
  try {
    const snap = await getDocs(collection(db, "users", userId, "notes"));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((n) => n.type === "tracker");
  } catch (error) {
    console.error("Error fetching trackers:", error);
    throw error;
  }
};

// Create a tracker
export const createTracker = async (userId, name) => {
  if (!userId || !name.trim()) throw new Error("Missing data");
  try {
    const docRef = await addDoc(collection(db, "users", userId, "notes"), {
      name: name.trim(),
      type: "tracker",
      rows: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating tracker:", error);
    throw error;
  }
};

// Update a tracker (renaming or modifying rows)
export const updateTracker = async (userId, trackerId, updates) => {
  if (!userId || !trackerId) throw new Error("Missing data");
  try {
    const ref = doc(db, "users", userId, "notes", trackerId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error updating tracker:", error);
    throw error;
  }
};

// Delete a tracker
export const deleteTracker = async (userId, trackerId) => {
  if (!userId || !trackerId) throw new Error("Missing data");
  try {
    await deleteDoc(doc(db, "users", userId, "notes", trackerId));
  } catch (error) {
    console.error("Error deleting tracker:", error);
    throw error;
  }
};

/* ===============================
   LAYOUT PREFERENCES METHODS
================================ */

export const getUserPreferences = async (userId) => {
  if (!userId) return null;
  try {
    const docRef = doc(db, "users", userId, "notes", "preferences_layout");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return null;
  }
};

export const saveUserPreferences = async (userId, preferences) => {
  if (!userId) return;
  try {
    const docRef = doc(db, "users", userId, "notes", "preferences_layout");
    await setDoc(docRef, {
      ...preferences,
      type: "preferences",
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving user preferences:", error);
  }
};

