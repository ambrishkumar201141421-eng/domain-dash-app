import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const GARBA_ART = "/events/garba.jpg";
export const GARBA_COPY =
  "Don't go solo! Find students from your campus to dance, celebrate, and make unforgettable memories this Navratri.";

/** Single cinematic Garba Night feature. Text sits on a dark scrim, so it stays white in both themes. */
export function GarbaBanner({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="Garba Night — Find Your Garba Partner"
      className="group relative overflow-hidden rounded-3xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className={compact ? "relative aspect-[16/9] sm:aspect-[16/6]" : "relative aspect-[4/5] sm:aspect-[16/8]"}>
        <img
          src={GARBA_ART}
          alt="Cartoon illustration of Indian college students in colourful traditional outfits dancing Garba with dandiya sticks under festive lights"
          width={1600}
          height={912}
          loading="eager"
          className="absolute inset-0 size-full object-cover object-[65%_center] transition-transform duration-[4000ms] ease-out group-hover:scale-110 motion-safe:animate-[garba-zoom_12s_ease-out_forwards] motion-reduce:transition-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent sm:bg-gradient-to-r sm:from-black/85 sm:via-black/40 sm:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white sm:inset-y-0 sm:max-w-[60%] sm:justify-center sm:p-8 [&_*]:text-white">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
            <Sparkles className="size-3" /> Navratri special
          </span>
          {compact ? (
            <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">Garba Night</h1>
          ) : (
            <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-6xl">Garba Night</h2>
          )}
          <p className="text-lg font-semibold sm:text-2xl">Find Your Garba Partner</p>
          {!compact && <p className="line-clamp-3 text-sm opacity-90 sm:text-base">{GARBA_COPY}</p>}
          {!compact && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to="/garba"
                hash="join"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [&]:text-primary-foreground"
              >
                Find Your Partner
              </Link>
              <Link
                to="/garba"
                className="rounded-full border border-white/50 bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore Garba Night
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
