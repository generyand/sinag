/**
 * Hook for fetching signed URLs for secure file access.
 *
 * This hook fetches time-limited signed URLs from the backend to access
 * files stored in private Supabase Storage buckets.
 */

import {
  useGetMovsFilesFileIdSignedUrl,
  getGetMovsFilesFileIdSignedUrlQueryKey,
} from "@sinag/shared";

interface UseSignedUrlOptions {
  /** Cache time in milliseconds (default: 30 minutes) */
  staleTime?: number;
  /** Whether to enable the query (default: true if fileId is provided) */
  enabled?: boolean;
}

/**
 * Hook to fetch a signed URL for a MOV file.
 *
 * @param fileId - The ID of the MOV file
 * @param options - Query options
 * @returns Object containing signed URL, loading state, and error
 *
 * @example
 * ```tsx
 * const { signedUrl, isLoading, error } = useSignedUrl(file.id);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return <img src={signedUrl} />;
 * ```
 */
export function useSignedUrl(fileId: number | null | undefined, options: UseSignedUrlOptions = {}) {
  const { staleTime = 1000 * 60 * 30, enabled = true } = options;

  const { data, isLoading, error, refetch } = useGetMovsFilesFileIdSignedUrl(fileId ?? 0, {
    query: {
      queryKey: getGetMovsFilesFileIdSignedUrlQueryKey(fileId ?? 0),
      enabled: enabled && !!fileId,
      staleTime,
      retry: 2,
    },
  });

  return {
    signedUrl: data?.signed_url ?? null,
    isLoading: !!fileId && isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Fetch a signed URL imperatively (for use in event handlers like download).
 *
 * @param fileId - The ID of the MOV file
 * @returns Promise resolving to the signed URL
 *
 * @example
 * ```tsx
 * const handleDownload = async (file) => {
 *   const signedUrl = await fetchSignedUrl(file.id);
 *   window.open(signedUrl, '_blank');
 * };
 * ```
 */
export async function fetchSignedUrl(fileId: number): Promise<string> {
  const response = await fetch(`/api/v1/movs/files/${fileId}/signed-url`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch signed URL: ${response.statusText}`);
  }

  const data = await response.json();
  return data.signed_url;
}
