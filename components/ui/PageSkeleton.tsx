import { Skeleton } from "@/components/ui/Skeleton";

/** Generic placeholder shown by route-level loading.tsx files while a server page fetches its data. */
export default function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="card-surface rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-10 lg:col-span-6" />
          <Skeleton className="h-10 lg:col-span-3" />
          <Skeleton className="h-10 lg:col-span-3" />
        </div>
      </div>

      <div className="card-surface overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="divide-y divide-slate-100 px-2 py-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
