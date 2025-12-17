import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NotesToolbar({ search, setSearch, sort, setSort }) {
  return (
    <div className="flex gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
        <Input
          className="pl-9"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Button
        variant="outline"
        onClick={() =>
          setSort(sort === "latest" ? "oldest" : "latest")
        }
      >
        <ArrowUpDown className="h-4 w-4 mr-2" />
        Sort
      </Button>
    </div>
  );
}
