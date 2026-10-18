import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { avatarSrcQuery } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** The one avatar used everywhere: profile picture from the profile record, initials as fallback. */
export function UserAvatar({
  url,
  name,
  className = "size-10",
}: {
  url?: string | null | undefined;
  name?: string | null | undefined;
  className?: string;
}) {
  const { data: src, isLoading } = useQuery(avatarSrcQuery(url));
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "S";
  const showImg = src && failed !== src;

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary",
        className,
      )}
      aria-hidden="true"
    >
      {(!showImg || loaded !== src) && !isLoading && <span className="text-[0.9em]">{initial}</span>}
      {isLoading && <span className="absolute inset-0 animate-pulse bg-muted" />}
      {showImg && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(src)}
          onError={() => setFailed(src)}
          className={cn("absolute inset-0 size-full object-cover transition-opacity", loaded === src ? "opacity-100" : "opacity-0")}
        />
      )}
    </span>
  );
}
