export type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  error_description?: string;
};

export function formatUnknownError(err: unknown): string {
  if (!err) return "Erreur inattendue.";

  if (typeof err === "string") return err;

  if (err instanceof Error) {
    return err.message || "Erreur inattendue.";
  }

  // Supabase error-like object
  const e = err as SupabaseLikeError;
  const msg = e.message || e.error_description || "Erreur inattendue.";
  const details = e.details ? ` (${e.details})` : "";
  return `${msg}${details}`;
}
