import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Play, Volume2, VolumeX, ShoppingBag, Zap, Star, Video, Maximize2, X, ChevronUp, ChevronDown } from "lucide-react";
import { products, newArrivals, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import reelLamp from "@/assets/reel-lamp.mp4.asset.json";
import reelCharger from "@/assets/reel-charger.mp4.asset.json";
import reelSpeaker from "@/assets/reel-speaker.mp4.asset.json";
import reelDiffuser from "@/assets/reel-diffuser.mp4.asset.json";
import reelCustom1 from "@/assets/reel-custom-1.mp4";

type Reel = {
  id: string;
  videoUrl: string;
  caption: string;
  product: Product;
};

const findProduct = (id: string): Product => {
  const all = [...products, ...newArrivals];
  return all.find((p) => p.id === id)!;
};

const reels: Reel[] = [
  { id: "r1", videoUrl: reelLamp.url, caption: "Cozy vibes only ✨", product: findProduct("crystal-lamp") },
  { id: "r2", videoUrl: reelCharger.url, caption: "Snap. Charge. Done. ⚡", product: findProduct("magsafe-charger") },
  { id: "r3", videoUrl: reelSpeaker.url, caption: "Big sound, tiny size 🔊", product: findProduct("mini-speaker") },
  { id: "r4", videoUrl: reelDiffuser.url, caption: "Relax mode: ON 🌿", product: findProduct("aroma-diffuser") },
  { id: "r5", videoUrl: reelCustom1, caption: "Trending now 🔥", product: findProduct("diy-kit") },
];

function ReelCard({
  reel,
  muted,
  onUnmute,
  onExpand,
}: {
  reel: Reel;
  muted: boolean;
  onUnmute: () => void;
  onExpand: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { add } = useCart();
  const navigate = useNavigate();
  const off = Math.round(((reel.product.oldPrice - reel.product.price) / reel.product.oldPrice) * 100);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-[9/16] w-full shrink-0 snap-start overflow-hidden rounded-3xl border border-border bg-foreground shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elevated)] sm:w-72"
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.product.image}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        onClick={togglePlay}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/70 to-transparent" />
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/15 px-2.5 py-1 text-[10px] font-bold text-background backdrop-blur-md">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
        </span>
        REEL
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <button
          onClick={onUnmute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          onClick={onExpand}
          aria-label="Full view"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {!isPlaying && (
        <button onClick={togglePlay} aria-label="Play" className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg transition hover:scale-110">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </span>
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground via-foreground/85 to-transparent p-3 pt-10 text-background">
        <p className="mb-2 line-clamp-2 text-sm font-semibold">{reel.caption}</p>
        <div className="rounded-2xl border border-background/15 bg-background/10 p-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <img src={reel.product.image} alt={reel.product.title} loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xs font-bold text-background">{reel.product.title}</h4>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-background">৳{reel.product.price}</span>
                <span className="text-[10px] text-background/50 line-through">৳{reel.product.oldPrice}</span>
                <span className="rounded-md bg-emerald-500 px-1 py-0.5 text-[9px] font-bold text-white">-{off}%</span>
              </div>
              <div className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-background/70">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-background">{reel.product.rating}</span>
                <span>({reel.product.reviews})</span>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => add(reel.product)}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-background/25 bg-background/10 px-2 py-1.5 text-[11px] font-bold text-background backdrop-blur-md transition hover:bg-background/20"
            >
              <ShoppingBag className="h-3 w-3" /> Add
            </button>
            <button
              onClick={() => {
                add(reel.product);
                navigate({ to: "/checkout" });
              }}
              className="inline-flex items-center justify-center gap-1 rounded-full bg-primary px-2 py-1.5 text-[11px] font-bold text-primary-foreground shadow-md transition hover:scale-[1.03]"
            >
              <Zap className="h-3 w-3" /> Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FullscreenViewer({
  startIndex,
  muted,
  onMuteToggle,
  onClose,
}: {
  startIndex: number;
  muted: boolean;
  onMuteToggle: () => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ y: number; t: number } | null>(null);
  const mouseStartRef = useRef<{ y: number; t: number } | null>(null);
  const reel = reels[index];
  const videoRef = useRef<HTMLVideoElement>(null);
  const { add } = useCart();
  const navigate = useNavigate();
  const off = Math.round(((reel.product.oldPrice - reel.product.price) / reel.product.oldPrice) * 100);

  const goNext = () => setIndex((i) => Math.min(i + 1, reels.length - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, t: Date.now() };
    setDragY(0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if ((index === 0 && dy > 0) || (index === reels.length - 1 && dy < 0)) {
      setDragY(dy * 0.3);
    } else {
      setDragY(dy);
    }
  };
  const onTouchEnd = () => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const dt = Date.now() - start.t;
    const velocity = Math.abs(dragY) / Math.max(dt, 1);
    const threshold = 80;
    if (dragY < -threshold || (dragY < -30 && velocity > 0.4)) {
      goNext();
    } else if (dragY > threshold || (dragY > 30 && velocity > 0.4)) {
      goPrev();
    }
    setDragY(0);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartRef.current = { y: e.clientY, t: Date.now() };
    setIsDragging(true);
    setDragY(0);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!mouseStartRef.current || !isDragging) return;
    const dy = e.clientY - mouseStartRef.current.y;
    if ((index === 0 && dy > 0) || (index === reels.length - 1 && dy < 0)) {
      setDragY(dy * 0.3);
    } else {
      setDragY(dy);
    }
  };
  const onMouseUp = () => {
    const start = mouseStartRef.current;
    mouseStartRef.current = null;
    setIsDragging(false);
    if (!start) return;
    const dt = Date.now() - start.t;
    const velocity = Math.abs(dragY) / Math.max(dt, 1);
    const threshold = 80;
    if (dragY < -threshold || (dragY < -30 && velocity > 0.4)) {
      goNext();
    } else if (dragY > threshold || (dragY > 30 && velocity > 0.4)) {
      goPrev();
    }
    setDragY(0);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 30) return;
    if (e.deltaY > 0) goNext();
    else goPrev();
  };

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  }, [index]);

  // Lock scroll & ESC handler
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setIndex((i) => Math.min(i + 1, reels.length - 1));
      if (e.key === "ArrowUp") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/95 backdrop-blur-md animate-fade-in sm:p-4"
      onWheel={onWheel}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25 sm:right-5 sm:top-5 sm:h-11 sm:w-11"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-background/15 px-3 py-1.5 text-xs font-bold text-background backdrop-blur-md sm:top-5">
        {index + 1} / {reels.length}
      </div>

      {/* Up/Down nav — desktop only */}
      <button
        onClick={goPrev}
        disabled={index === 0}
        aria-label="Previous reel"
        className="absolute right-6 top-1/2 z-30 hidden h-11 w-11 -translate-y-16 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 md:inline-flex"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <button
        onClick={goNext}
        disabled={index === reels.length - 1}
        aria-label="Next reel"
        className="absolute right-6 top-1/2 z-30 hidden h-11 w-11 translate-y-4 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 md:inline-flex"
      >
        <ChevronDown className="h-5 w-5" />
      </button>

      {/* Reel stage — fills mobile, contained on desktop */}
      <div
        className="relative h-full w-full overflow-hidden bg-foreground shadow-2xl select-none sm:h-[min(95vh,920px)] sm:w-auto sm:aspect-[9/16] sm:rounded-3xl sm:border sm:border-background/15"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <video
          ref={videoRef}
          key={reel.id}
          src={reel.videoUrl}
          poster={reel.product.image}
          muted={muted}
          loop
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) v.play();
            else v.pause();
          }}
        />

        {/* Live badge */}
        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/15 px-2.5 py-1 text-[10px] font-bold text-background backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
          </span>
          REEL
        </div>

        {/* Mute */}
        <button
          onClick={onMuteToggle}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Bottom info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground via-foreground/90 to-transparent p-5 pt-16 text-background">
          <p className="mb-3 text-base font-semibold">{reel.caption}</p>
          <div className="rounded-2xl border border-background/15 bg-background/10 p-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <img src={reel.product.image} alt={reel.product.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {reel.product.category}
                </span>
                <h4 className="mt-1 truncate text-sm font-bold text-background">{reel.product.title}</h4>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-lg font-extrabold text-background">৳{reel.product.price}</span>
                  <span className="text-xs text-background/50 line-through">৳{reel.product.oldPrice}</span>
                  <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">-{off}%</span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => add(reel.product)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-background/25 bg-background/10 px-3 py-2.5 text-xs font-bold text-background backdrop-blur-md transition hover:bg-background/20"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
              </button>
              <button
                onClick={() => {
                  add(reel.product);
                  navigate({ to: "/checkout" });
                  onClose();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition hover:scale-[1.03]"
              >
                <Zap className="h-3.5 w-3.5" /> Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchAndShop() {
  const [muted, setMuted] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/40 to-background">
      <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Video className="h-3 w-3" /> Watch &amp; Shop
            </span>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">
              See it live, <span className="text-primary">shop instantly</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              Tap the expand icon for full view — swipe through reels
            </p>
          </div>
        </div>

        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">
          {reels.map((r, i) => (
            <ReelCard
              key={r.id}
              reel={r}
              muted={muted}
              onUnmute={() => setMuted((m) => !m)}
              onExpand={() => setOpenIndex(i)}
            />
          ))}
        </div>
      </div>

      {openIndex !== null && (
        <FullscreenViewer
          startIndex={openIndex}
          muted={muted}
          onMuteToggle={() => setMuted((m) => !m)}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
