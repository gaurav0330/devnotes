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

  // Add random suffix to ensure uniqueness
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
    if (!cleanTitle) {
      throw new Error("Title is required");
    }

    const slug = generateSlug(cleanTitle);

    // Create private note
    const privateRef = collection(db, "users", userId, "notes");
    const privateDoc = await addDoc(privateRef, {
      title: cleanTitle,
      content,
      slug,
      tags: tags.filter((t) => t.trim()),
      visibility,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create public copy if visibility is public
    if (visibility === "public") {
      await addDoc(collection(db, "publicNotes"), {
        privateNoteId: privateDoc.id,
        userId,
        title: cleanTitle,
        content,
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
    const notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    // Sort by creation date, newest first
    return notes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error("Error fetching user notes:", error);
    throw error;
  }
};

/* ---------------------------------------------------
   READ: PUBLIC NOTE BY SLUG (SHARE LINK)
--------------------------------------------------- */
export const getPublicNoteBySlug = async (slug) => {
  try {
    const q = query(collection(db, "publicNotes"), where("slug", "==", slug));
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error("Error fetching public note:", error);
    throw error;
  }
};

/* ---------------------------------------------------
   READ: PRIVATE NOTE BY SLUG (OWNER ONLY)
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
    return { id: docSnap.id, ...docSnap.data() };
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
}) => {
  try {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      throw new Error("Title is required");
    }

    // Update private note
    const privateRef = doc(db, "users", userId, "notes", noteId);
    await updateDoc(privateRef, {
      title: cleanTitle,
      content,
      tags: tags.filter((t) => t.trim()),
      visibility,
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
        // Update existing public copy
        await updateDoc(publicRef, {
          title: cleanTitle,
          content,
          tags: tags.filter((t) => t.trim()),
          updatedAt: Date.now(),
        });
      } else {
        // Remove public copy if switched to private
        await deleteDoc(publicRef);
      }
    } else if (visibility === "public") {
      // Create new public copy if switched from private to public
      // Need to get the slug from the private note
      const privateSnap = await getDocs(
        query(
          collection(db, "users", userId, "notes"),
          where("__name__", "==", noteId)
        )
      );
      
      const slug = privateSnap.docs[0]?.data().slug || generateSlug(cleanTitle);
      
      await addDoc(collection(db, "publicNotes"), {
        privateNoteId: noteId,
        userId,
        title: cleanTitle,
        content,
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
  try {
    // Delete private note
    await deleteDoc(doc(db, "users", userId, "notes", noteId));

    // Delete public copy if exists
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