import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-72" />
          </div>
        </div>

        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

