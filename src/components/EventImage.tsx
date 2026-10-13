import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PartyPopper } from "lucide-react";
import { resolveEventImage } from "@/lib/events";
import { cn } from "@/lib/utils";

/** Fills its (fixed-aspect) parent; falls back to branded artwork if missing or broken. */
export function EventImage({
  src,
  alt,
  eager,
  className,
}: {
  src: string | null;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const { data: url } = useQuery({
    queryKey: ["event-image", src],
    queryFn: () => resolveEventImage(src),
    staleTime: 60 * 60_000,
    enabled: Boolean(src),
  });

  if (!src || failed || (src && url === null)) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "absolute inset-0 grid place-items-center bg-gradient-to-br from-lounge-soft via-hustle-soft to-playground-soft",
          className,
        )}
      >
        <PartyPopper className="size-10 text-lounge opacity-60" />
      </div>
    );
  }

  return (
    <>
      <div className="absolute inset-0 animate-pulse bg-surface" aria-hidden />
      {url && (
        <img
          src={url}
          alt={alt}
          width={1600}
          height={912}
          loading={eager ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          className={cn("absolute inset-0 size-full object-cover", className)}
        />
      )}
    </>
  );
}
