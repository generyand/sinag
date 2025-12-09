import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Build a public URL for a Supabase Storage object in the `movs` bucket.
// Accepts either an absolute URL or a storage path like
// "assessment-123/response-456/filename.pdf" and returns an absolute URL.
export function resolveMovUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!base) return storagePath; // best effort fallback
  const root = base.replace(/\/$/, "");
  return `${root}/storage/v1/object/public/movs/${storagePath}`;
}
