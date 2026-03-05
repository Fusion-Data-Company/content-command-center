export default function ProjectLoading() {
  return (
    <div className="h-full flex flex-col">
      {/* Header skeleton */}
      <div className="px-6 py-3 border-b border-border">
        <div className="skeleton h-5 w-48" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 px-6 py-6 space-y-4">
        <div className="flex justify-end">
          <div className="skeleton h-16 w-64 rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <div className="skeleton h-24 w-80 rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <div className="skeleton h-12 w-48 rounded-2xl" />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="px-6 py-4 border-t border-border">
        <div className="skeleton h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}
