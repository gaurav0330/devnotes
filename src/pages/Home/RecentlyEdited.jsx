import { Clock } from "lucide-react";

export default function RecentlyEdited({ notes }) {
  if (notes.length === 0) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 font-semibold mb-2">
        <Clock className="h-4 w-4" /> Recently Edited
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        {notes.map((n) => (
          <div key={n.id} className="p-3 border rounded-lg bg-muted">
            {n.title}
          </div>
        ))}
      </div>
    </div>
  );
}
