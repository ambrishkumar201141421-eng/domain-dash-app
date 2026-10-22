import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import hangoutsImg from "@/assets/people-hangouts.jpg";
import sportsImg from "@/assets/people-sports.jpg";
import studyImg from "@/assets/people-study.jpg";
import eventsImg from "@/assets/people-events.jpg";
import { cn } from "@/lib/utils";

export type PeopleTarget = "hangouts" | "sports" | "study" | "events";

const SLIDES: { key: PeopleTarget; title: string; tagline: string; img: string; alt: string }[] = [
  {
    key: "hangouts",
    title: "Friends & Hangouts",
    tagline: "Your next favourite people are here.",
    img: hangoutsImg,
    alt: "Students laughing over chai at a campus canteen",
  },
  {
    key: "sports",
    title: "Sports & Activities",
    tagline: "Find your next teammate.",
    img: sportsImg,
    alt: "Students playing badminton and football under floodlights",
  },
  {
    key: "study",
    title: "Study & Projects",
    tagline: "Better together.",
    img: studyImg,
    alt: "Students working on a project together in the library",
  },
  {
    key: "events",
    title: "Events & Fests",
    tagline: "Never miss a campus moment.",
    img: eventsImg,
    alt: "A cheering crowd at a college fest at night",
  },
];

const AUTOPLAY_MS = 5500;

export function FindYourPeople({ onSelect }: { onSelect: (target: PeopleTarget) => void }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "center" });
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    if (mq.matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!embla) return;
    const onSel = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSel);
    onSel();
    return () => {
      embla.off("select", onSel);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla || !playing || hovered || reducedMotion) return;
    const t = window.setInterval(() => embla.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [embla, playing, hovered, reducedMotion]);

  const go = useCallback((i: number) => embla?.scrollTo(i), [embla]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Find Your People"
      className="space-y-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Find Your People</h2>
          <p className="text-sm text-muted-foreground">Your campus. Your interests. Your people.</p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
        >
          {playing && !reducedMotion ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
      </div>

      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden rounded-3xl">
          <div className="flex">
            {SLIDES.map((s, i) => (
              <div
                key={s.key}
                className="min-w-0 shrink-0 grow-0 basis-[88%] pl-3 first:pl-0 sm:basis-[80%]"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${SLIDES.length}: ${s.title}`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(s.key)}
                  className={cn(
                    "group relative block aspect-[4/3] w-full overflow-hidden rounded-3xl text-left transition-transform duration-500",
                    i === index ? "scale-100" : "scale-[0.94] opacity-80",
                  )}
                >
                  <img
                    src={s.img}
                    alt={s.alt}
                    width={1280}
                    height={800}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-scrim via-scrim/50 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-on-scrim">
                    <p className="font-display text-2xl font-bold leading-tight">{s.title}</p>
                    <p className="mt-1 text-sm opacity-90">{s.tagline}</p>
                    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-on-scrim/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                      Explore <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => embla?.scrollPrev()}
          aria-label="Previous slide"
          className="absolute left-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-scrim/60 text-on-scrim backdrop-blur md:grid"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => embla?.scrollNext()}
          aria-label="Next slide"
          className="absolute right-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-scrim/60 text-on-scrim backdrop-blur md:grid"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to ${s.title}`}
            aria-current={i === index}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-6 bg-primary" : "w-1.5 bg-border",
            )}
          />
        ))}
      </div>
    </section>
  );
}
