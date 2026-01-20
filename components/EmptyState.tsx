import Link from "next/link";

export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction
}: {
  title: string;
  description?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
        {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}

        {primaryAction || secondaryAction ? (
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {primaryAction ? (
              <Link
                href={primaryAction.href}
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                {primaryAction.label}
              </Link>
            ) : null}
            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

