import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import LZString from "lz-string";


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

    // Create private note
    const privateRef = collection(db, "users", userId, "notes");
    const privateDoc = await addDoc(privateRef, {
      title: cleanTitle,
      content: compressedContent,
      isCompressed: true,
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
        content: decompressContent(data.content, data.isCompressed),
      };
    });

    return notes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error("Error fetching user notes:", error);
    throw error;
  }
};

/* ---------------------------------------------------
   READ: PUBLIC NOTE BY SLUG
--------------------------------------------------- */
export const getPublicNoteBySlug = async (slug) => {
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
};

/* ---------------------------------------------------
   READ: PRIVATE NOTE BY SLUG
--------------------------------------------------- */
export const getPrivateNoteBySlug = async (userId, slug) => {
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

    // Update private note
    const privateRef = doc(db, "users", userId, "notes", noteId);
    await updateDoc(privateRef, {
      title: cleanTitle,
      content: compressedContent,
      isCompressed: true,
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
          tags: tags.filter((t) => t.trim()),
          updatedAt: Date.now(),
        });
      } else {
        await deleteDoc(publicRef);
      }
    } else if (visibility === "public") {
      // Create public copy if switching to public
      const privateSnap = await getDocs(
        query(
          collection(db, "users", userId, "notes"),
          where("__name__", "==", noteId)
        )
      );

      const slug =
        privateSnap.docs[0]?.data().slug || generateSlug(cleanTitle);

      await addDoc(collection(db, "publicNotes"), {
        privateNoteId: noteId,
        userId,
        title: cleanTitle,
        content: compressedContent,
        isCompressed: true,
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
   DELETE NOTE (PRIVATE + PUBLIC)
--------------------------------------------------- */
export const deleteNoteById = async (userId, noteId) => {
  if (!userId || !noteId) {
    throw new Error("Missing userId or noteId");
  }

  try {
    await deleteDoc(doc(db, "users", userId, "notes", noteId));

    const q = query(
      collection(db, "publicNotes"),
      where("privateNoteId", "==", noteId)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      await deleteDoc(doc(db, "publicNotes", snap.docs[0].id));
    }
  } catch (error) {
    console.error("Error deleting note:", error);
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
