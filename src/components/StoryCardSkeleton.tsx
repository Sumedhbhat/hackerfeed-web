export function StoryCardSkeleton({ index }: { index?: number } = {}) {
  return (
    <article key={index} className="p-5 rounded-lg sm:p-6 island-shell">
      <div className="flex gap-6 animate-pulse">
        <div className="flex-none pt-1 w-7">
          <div className="w-5 h-3 rounded-sm bg-(--sand)" />
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="w-24 h-2.5 rounded-sm bg-(--sand)" />
          <div className="h-5 w-[85%] rounded-sm bg-(--sand) opacity-80" />
          <div className="h-5 w-[60%] rounded-sm bg-(--sand) opacity-60" />
          <div className="w-48 h-2.5 rounded-sm opacity-50 bg-(--sand)" />
          <div className="flex gap-3 pt-1">
            <div className="w-20 h-3 rounded-sm opacity-60 bg-(--sand)" />
            <div className="w-24 h-3 rounded-sm opacity-40 bg-(--sand)" />
            <div className="w-14 h-3 rounded-sm opacity-30 bg-(--sand)" />
          </div>
        </div>
      </div>
    </article>
  );
}
