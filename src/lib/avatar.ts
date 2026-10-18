import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Returns an error message, or null when the file is acceptable. */
export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return "Please choose a JPG, PNG or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "That image is larger than 5 MB. Please pick a smaller one.";
  return null;
}

/** avatar_url stores a bucket path ("avatars/<uid>/<file>.webp"); the bucket is private, so we sign it. */
export const avatarSrcQuery = (stored: string | null | undefined) =>
  queryOptions({
    queryKey: ["avatar-src", stored],
    enabled: Boolean(stored),
    staleTime: 50 * 60_000,
    queryFn: async (): Promise<string | null> => {
      if (!stored) return null;
      if (stored.startsWith("http") || stored.startsWith("/")) return stored;
      const path = stored.replace(`${AVATAR_BUCKET}/`, "");
      const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });
