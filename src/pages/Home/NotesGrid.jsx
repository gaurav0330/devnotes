import NoteCard from "./NoteCard";

export default function NotesGrid({ notes, onDragStart }) {
  if (notes.length === 0) {
    return <p className="text-muted-foreground">No notes here.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
}
