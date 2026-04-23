import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

type Props = {
  images: string[];
  title: string;
  activeImg: string;
  setActiveImg: (src: string) => void;
};

/**
 * Mobile-first swipeable product gallery.
 * - Uses native CSS scroll-snap for buttery 1:1 finger tracking on touch devices.
 * - Desktop arrow buttons + clickable dots.
 * - Tap to open fullscreen lightbox (also swipeable).
 */
export default function ProductGallery({ images, title, activeImg, setActiveImg }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const curIdx = Math.max(0, images.indexOf(activeImg));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const isProgrammaticScroll = useRef(false);

  // Scroll to active image when changed externally (thumbnail click, arrow buttons)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = curIdx * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 4) return;
    isProgrammaticScroll.current = true;
    el.scrollTo({ left: target, behavior: "smooth" });
    const t = setTimeout(() => (isProgrammaticScroll.current = false), 500);
    return () => clearTimeout(t);
  }, [curIdx]);

  // Update active image as user swipes (snap-stopped)
  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || isProgrammaticScroll.current) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    const next = images[i];
    if (next && next !== activeImg) setActiveImg(next);
  }, [images, activeImg, setActiveImg]);

  const goto = (i: number) => {
    const safe = ((i % images.length) + images.length) % images.length;
    setActiveImg(images[safe]);
  };

  return (
    <>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setLightboxIdx(i);
              setLightboxOpen(true);
            }}
            className="relative aspect-square w-full shrink-0 snap-center snap-always"
            style={{ scrollSnapAlign: "center" }}
            aria-label={`View image ${i + 1} fullscreen`}
          >
            <img
              src={src}
              alt={`${title} — image ${i + 1}`}
              width={1024}
              height={1024}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </button>
        ))}
      </div>

      {/* Desktop arrows */}
      <button
        type="button"
        onClick={() => goto(curIdx - 1)}
        aria-label="Previous image"
        className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md backdrop-blur transition hover:scale-110 md:inline-flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => goto(curIdx + 1)}
        aria-label="Next image"
        className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md backdrop-blur transition hover:scale-110 md:inline-flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Fullscreen hint pill (mobile) */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 hidden items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-semibold backdrop-blur md:hidden">
        <Maximize2 className="h-3 w-3" /> Tap to zoom
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => goto(i)}
            aria-label={`Go to image ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === curIdx ? "w-6 bg-primary" : "w-1.5 bg-background/80"
            }`}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          title={title}
          startIdx={lightboxIdx}
          onClose={() => setLightboxOpen(false)}
          onChange={(i) => setActiveImg(images[i])}
        />
      )}
    </>
  );
}

function Lightbox({
  images,
  title,
  startIdx,
  onClose,
  onChange,
}: {
  images: string[];
  title: string;
  startIdx: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(startIdx);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: startIdx * el.clientWidth, behavior: "instant" as ScrollBehavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") jump(-1);
      if (e.key === "ArrowRight") jump(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const jump = (d: number) => {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, idx + d));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) {
      setIdx(i);
      onChange(i);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm font-semibold">
          {idx + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4"
          >
            <img
              src={src}
              alt={`${title} — image ${i + 1}`}
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => jump(-1)}
        aria-label="Previous"
        className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:inline-flex"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={() => jump(1)}
        aria-label="Next"
        className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:inline-flex"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
