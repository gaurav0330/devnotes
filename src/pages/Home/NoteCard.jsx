import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { stripHtml } from "./utils";

export default function NoteCard({ note, onDragStart }) {
  return (
    <Link
      to={`/note/${note.slug}`}
      draggable
      onDragStart={() => onDragStart(note.id)}
      className="border rounded-xl p-4 space-y-3 bg-card hover:shadow-lg transition"
    >
      <h3 className="font-semibold line-clamp-2">{note.title}</h3>

      <p className="text-sm text-muted-foreground line-clamp-2">
        {stripHtml(note.content)}
      </p>

      {note.tags?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {note.tags.slice(0, 3).map((t, i) => (
            <span key={i} className="badge badge-primary">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {new Date(note.createdAt).toLocaleDateString()}
      </div>
    </Link>
  );
}
