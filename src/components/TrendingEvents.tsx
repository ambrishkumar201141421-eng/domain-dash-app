import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { EventImage } from "@/components/EventImage";
import { publishedEventsQuery, eventDestination, formatEventDate, type CampusEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

const INTERVAL = 6000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function TrendingEvents() {
  const { data, isLoading, error } = useQuery(publishedEventsQuery);
  const events = (data ?? []).filter((e) => e.is_featured);
  const reduced = usePrefersReducedMotion();
  const [emblaRef, embla] = useEmblaCarousel({
    loop: events.length > 1,
    active: events.length > 1,
    duration: reduced ? 0 : 28,
  });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
    onSelect();
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla || paused || reduced || events.length < 2) return;
    const t = window.setInterval(() => embla.scrollNext(), INTERVAL);
    return () => window.clearInterval(t);
  }, [embla, paused, reduced, events.length, index]);

  const prev = useCallback(() => embla?.scrollPrev(), [embla]);
  const next = useCallback(() => embla?.scrollNext(), [embla]);

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Trending Events"
      className="space-y-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Trending Events</h2>
          <p className="text-sm text-muted-foreground">
            Your campus. Your people. Your next big memory.
          </p>
        </div>
        <Link
          to="/events"
          className="inline-flex shrink-0 items-center gap-1 rounded-full text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Explore All Events <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="relative">
        {isLoading ? (
          <div className="aspect-[4/5] animate-pulse rounded-3xl bg-surface sm:aspect-[16/8]" />
        ) : error ? (
          <div className="glass-card grid aspect-[16/8] place-items-center rounded-3xl p-6 text-center text-sm text-muted-foreground">
            Events couldn't load right now. Pull to refresh in a moment.
          </div>
        ) : events.length === 0 ? (
          <div className="glass-card grid place-items-center rounded-3xl px-6 py-10 text-center text-sm text-muted-foreground">
            No trending events yet — check back soon.
          </div>
        ) : (
          <>
            <div ref={emblaRef} className="overflow-hidden rounded-3xl">
              <div className="flex touch-pan-y">
                {events.map((e, i) => (
                  <Slide key={e.id} event={e} active={i === index} first={i === 0} total={events.length} n={i + 1} />
                ))}
              </div>
            </div>
            {events.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous event"
                  className="absolute left-2 top-[38%] hidden size-10 place-items-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  onClick={next}
                  aria-label="Next event"
                  className="absolute right-2 top-[38%] hidden size-10 place-items-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid"
                >
                  <ChevronRight className="size-5" />
                </button>
                <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Choose event">
                  {events.map((e, i) => (
                    <button
                      key={e.id}
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`Show ${e.title}`}
                      onClick={() => embla?.scrollTo(i)}
                      className={cn(
                        "h-1.5 overflow-hidden rounded-full bg-border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        i === index ? "w-8" : "w-3 hover:bg-muted-foreground",
                      )}
                    >
                      {i === index && (
                        <span
                          key={`${index}-${paused}`}
                          className={cn(
                            "block h-full bg-primary",
                            !paused && !reduced ? "animate-[ch-progress_6s_linear_forwards]" : "w-full",
                          )}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Slide({
  event,
  active,
  first,
  n,
  total,
}: {
  event: CampusEvent;
  active: boolean;
  first: boolean;
  n: number;
  total: number;
}) {
  const navigate = useNavigate();
  const date = formatEventDate(event);
  const go = (to: string) => navigate({ to });
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${n} of ${total}: ${event.title}`}
      aria-hidden={!active}
      className="relative min-w-0 flex-[0_0_100%]"
    >
      <div
        className="relative aspect-[4/5] cursor-pointer overflow-hidden rounded-3xl sm:aspect-[16/8]"
        onClick={() => go(`/events/${event.slug}`)}
      >
        <EventImage
          src={event.image_url}
          alt={event.image_alt ?? event.title}
          eager={first}
          className={cn(
            "object-[65%_center] transition-transform duration-[6000ms] ease-out motion-reduce:transition-none",
            active && "scale-105",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent sm:bg-gradient-to-r sm:from-black/85 sm:via-black/45 sm:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white sm:inset-y-0 sm:max-w-[60%] sm:justify-center sm:p-8 [&_*]:text-white">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              {event.category}
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur">
              {event.is_official ? "Official event" : "Community activity"}
            </span>
          </div>
          <p className="font-display text-3xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
            {event.title}
          </p>
          {event.headline && <p className="text-lg font-semibold sm:text-xl">{event.headline}</p>}
          {event.description && (
            <p className="line-clamp-3 text-sm opacity-90 sm:text-base">{event.description}</p>
          )}
          {event.is_official && (date || event.venue) && (
            <p className="text-xs font-medium opacity-90">{[date, event.venue].filter(Boolean).join(" · ")}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              tabIndex={active ? 0 : -1}
              onClick={() => go(eventDestination(event))}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [&]:text-primary-foreground"
            >
              {event.cta_label}
            </button>
            {eventDestination(event) !== `/events/${event.slug}` && (
              <button
                tabIndex={active ? 0 : -1}
                onClick={() => go(`/events/${event.slug}`)}
                className="rounded-full border border-white/50 bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore Event
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
