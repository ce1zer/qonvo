import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-4 w-72" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="mx-auto max-w-xl space-y-3 text-center">
          <Skeleton className="mx-auto h-6 w-56" />
          <Skeleton className="mx-auto h-4 w-96" />
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-full sm:w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

