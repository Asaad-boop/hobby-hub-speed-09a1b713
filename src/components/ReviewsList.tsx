import { useEffect, useMemo, useState } from "react";
import { Star, BadgeCheck, ChevronDown, MessageSquare, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { computeBreakdown, type ReviewWithProfile } from "@/lib/reviews";

type Props = {
  reviews: ReviewWithProfile[];
  loading?: boolean;
  fallbackRating?: number;
  fallbackCount?: number;
};

type Sort = "newest" | "highest" | "lowest";
const PAGE_SIZE = 10;

export default function ReviewsList({ reviews, loading, fallbackRating = 0, fallbackCount = 0 }: Props) {
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [videoLightbox, setVideoLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox && !videoLightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
        setVideoLightbox(null);
      }
      if (lightbox) {
        if (e.key === "ArrowRight") setLightbox((l) => (l ? { ...l, index: (l.index + 1) % l.images.length } : l));
        if (e.key === "ArrowLeft") setLightbox((l) => (l ? { ...l, index: (l.index - 1 + l.images.length) % l.images.length } : l));
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, videoLightbox]);

  const breakdown = useMemo(() => computeBreakdown(reviews), [reviews]);
  const sorted = useMemo(() => {
    const arr = [...reviews];
    if (sort === "highest") arr.sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") arr.sort((a, b) => a.rating - b.rating);
    else arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return arr;
  }, [reviews, sort]);

  const visible = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < sorted.length;

  const headerRating = breakdown.total ? breakdown.average : fallbackRating;
  const headerCount = breakdown.total || fallbackCount;

  return (
    <>
    <div className="grid gap-6 md:grid-cols-3">
      {/* Summary */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5 md:col-span-1 md:sticky md:top-24 md:self-start">
        <div className="flex items-center gap-3">
          <p className="text-4xl font-extrabold leading-none">{Number(headerRating).toFixed(1)}</p>
          <div>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(Number(headerRating))
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {headerCount.toLocaleString()} review{headerCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {breakdown.buckets.map((b) => (
            <div key={b.stars} className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex w-6 items-center gap-0.5 font-bold">
                {b.stars}
                <Star className="h-2.5 w-2.5 fill-primary text-primary" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${b.pct}%` }} />
              </div>
              <span className="w-8 text-right font-semibold text-muted-foreground">{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="grid gap-3 md:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-muted-foreground">
            {sorted.length} review{sorted.length === 1 ? "" : "s"}
          </p>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              setPage(1);
            }}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold outline-none focus:border-primary"
          >
            <option value="newest">Newest</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </div>

        {loading && (
          <div className="flex h-32 items-center justify-center rounded-xl border border-border">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-10 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-muted-foreground">No reviews yet.</p>
            <p className="text-xs text-muted-foreground">Be the first to share your experience!</p>
          </div>
        )}

        {visible.map((r) => {
          const ageMs = Date.now() - new Date(r.created_at).getTime();
          const days = Math.floor(ageMs / 86_400_000);
          const date =
            days < 1
              ? "Today"
              : days === 1
                ? "1 day ago"
                : days < 30
                  ? `${days} days ago`
                  : new Date(r.created_at).toLocaleDateString();
          const titleParts = (r.title ?? "").split(" · ");
          const name = r.display_name || titleParts[0] || "Verified buyer";
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-bold">{name}</p>
                    {r.order_id && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        <BadgeCheck className="h-2.5 w-2.5" /> Verified Purchase
                      </span>
                    )}
                    <div className="flex items-center text-primary">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-3 w-3 ${
                            j < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">• {date}</span>
                  </div>
                  {r.title && titleParts.length > 1 && (
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{r.title}</p>
                  )}
                  {r.comment && (
                    <p className="mt-1.5 text-xs leading-relaxed text-foreground">{r.comment}</p>
                  )}
                  {r.images && r.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.images.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLightbox({ images: r.images, index: i })}
                          className="group relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition hover:border-primary hover:shadow-md sm:h-24 sm:w-24"
                          aria-label={`View review photo ${i + 1}`}
                        >
                          <img
                            src={src}
                            alt={`Review photo ${i + 1}`}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                          />
                          <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                        </button>
                      ))}
                    </div>
                  )}
                  {r.videos && r.videos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.videos.map((src, i) => (
                        <video
                          key={i}
                          src={src}
                          controls
                          preload="metadata"
                          playsInline
                          className="h-40 w-auto max-w-full rounded-xl border border-border bg-black shadow-sm sm:h-48"
                        >
                          <track kind="captions" />
                        </video>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="mx-auto mt-1 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-xs font-bold transition hover:border-primary hover:text-primary"
          >
            Load more reviews <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>

    {lightbox && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        onClick={() => setLightbox(null)}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {lightbox.images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox((l) => l ? { ...l, index: (l.index - 1 + l.images.length) % l.images.length } : l); }}
              className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox((l) => l ? { ...l, index: (l.index + 1) % l.images.length } : l); }}
              className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <img
          src={lightbox.images[lightbox.index]}
          alt={`Review photo ${lightbox.index + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
        />

        {lightbox.images.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {lightbox.index + 1} / {lightbox.images.length}
          </div>
        )}
      </div>
    )}
    </>
  );
}
