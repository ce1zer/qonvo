export function safeInternalRedirect(
  redirectTo: string | null | undefined,
  fallback: string
) {
  if (!redirectTo) return fallback;
  if (!redirectTo.startsWith("/")) return fallback;
  if (redirectTo.startsWith("//")) return fallback;
  if (redirectTo.includes("://")) return fallback;
  if (redirectTo.includes("\\")) return fallback;
  return redirectTo;
}

