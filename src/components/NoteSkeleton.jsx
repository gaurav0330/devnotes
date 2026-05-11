export default function NoteSkeleton() {
  return (
    <div className="group relative flex flex-col border border-border/50 rounded-3xl p-6 bg-card overflow-hidden">
      {/* Accent line skeleton */}
      <div className="absolute top-0 left-0 bottom-0 w-1.5 animate-shimmer rounded-l-3xl" />
      
      {/* Top right icon skeleton */}
      <div className="absolute top-4 right-4 flex gap-2">
        <div className="h-8 w-8 rounded-xl animate-shimmer" />
      </div>

      <div className="space-y-4 flex-1 mt-2">
        {/* Title skeleton */}
        <div className="h-6 w-3/4 rounded-md animate-shimmer" style={{ animationDelay: '0ms' }} />
        
        {/* Content lines skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded-md animate-shimmer" style={{ animationDelay: '75ms' }} />
          <div className="h-4 w-5/6 rounded-md animate-shimmer" style={{ animationDelay: '150ms' }} />
        </div>

        {/* Read time skeleton */}
        <div className="flex items-center gap-4 pt-2">
          <div className="h-3 w-16 rounded-md animate-shimmer" style={{ animationDelay: '200ms' }} />
          <div className="h-3 w-12 rounded-md animate-shimmer" style={{ animationDelay: '250ms' }} />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border/50 flex flex-col gap-4">
        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-2">
          <div className="h-5 w-16 rounded-md animate-shimmer" style={{ animationDelay: '100ms' }} />
          <div className="h-5 w-12 rounded-md animate-shimmer" style={{ animationDelay: '175ms' }} />
        </div>

        {/* Date skeleton */}
        <div className="flex items-center gap-1.5 pt-1">
          <div className="h-3 w-3 rounded-full animate-shimmer" style={{ animationDelay: '150ms' }} />
          <div className="h-3 w-24 rounded-md animate-shimmer" style={{ animationDelay: '200ms' }} />
        </div>
      </div>
    </div>
  );
}

export function NotesGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <NoteSkeleton key={i} />
      ))}
    </div>
  );
}
