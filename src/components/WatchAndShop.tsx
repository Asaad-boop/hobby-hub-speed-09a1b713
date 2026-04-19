import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Play,
  Volume2,
  VolumeX,
  ShoppingBag,
  Zap,
  Star,
  Video,
  Maximize2,
  X,
  ChevronUp,
  ChevronDown,
  Heart,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { type Product, useProducts } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useSiteSettings } from "@/lib/site-settings";

type Reel = {
  id: string;
  videoUrl: string;
  caption: string;
  product: Product;
};

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
      className="group relative aspect-[9/16] w-[72vw] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-3xl border border-border bg-foreground shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elevated)] xs:w-[60vw] sm:w-[44vw] sm:max-w-[260px] md:w-[30vw] md:max-w-[260px] lg:w-[22vw] lg:max-w-[280px] xl:w-[260px]"
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
          onClick={(e) => {
            e.stopPropagation();
            onUnmute();
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          aria-label="Open full view"
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
            <img
              src={reel.product.image}
              alt={reel.product.title}
              loading="lazy"
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
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
              onClick={(e) => {
                e.stopPropagation();
                add(reel.product);
                toast.success("Added to cart");
              }}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-background/25 bg-background/10 px-2 py-1.5 text-[11px] font-bold text-background backdrop-blur-md transition hover:bg-background/20"
            >
              <ShoppingBag className="h-3 w-3" /> Add
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
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
  reels,
}: {
  startIndex: number;
  muted: boolean;
  onMuteToggle: () => void;
  onClose: () => void;
  reels: Reel[];
}) {
  const [index, setIndex] = useState(startIndex);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likeBurst, setLikeBurst] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const heartIdRef = useRef(0);
  const touchStartRef = useRef<{ y: number; t: number } | null>(null);
  const mouseStartRef = useRef<{ y: number; t: number; moved: boolean } | null>(null);
  const wheelLockRef = useRef(0);
  const reel = reels[index];
  const videoRef = useRef<HTMLVideoElement>(null);
  const { add } = useCart();
  const navigate = useNavigate();
  const off = reel ? Math.round(((reel.product.oldPrice - reel.product.price) / reel.product.oldPrice) * 100) : 0;
  const isLiked = reel ? !!liked[reel.id] : false;

  const goNext = () => setIndex((i) => Math.min(i + 1, reels.length - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  const triggerLike = (x?: number, y?: number) => {
    setLiked((prev) => ({ ...prev, [reel.id]: true }));
    setLikeBurst(true);
    setTimeout(() => setLikeBurst(false), 700);
    if (x != null && y != null) {
      const id = ++heartIdRef.current;
      setFloatingHearts((h) => [...h, { id, x, y }]);
      setTimeout(() => setFloatingHearts((h) => h.filter((fh) => fh.id !== id)), 900);
    }
  };

  const onShare = () => {
    const shareData = {
      title: reel.product.title,
      text: reel.caption,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareData.url);
      toast.success("Link copied to clipboard");
    }
  };

  // Touch swipe (mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, t: Date.now() };
    setDragY(0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if ((index === 0 && dy > 0) || (index === reels.length - 1 && dy < 0)) setDragY(dy * 0.3);
    else setDragY(dy);
  };
  const onTouchEnd = () => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const dt = Date.now() - start.t;
    const velocity = Math.abs(dragY) / Math.max(dt, 1);
    const threshold = 80;
    if (dragY < -threshold || (dragY < -30 && velocity > 0.4)) goNext();
    else if (dragY > threshold || (dragY > 30 && velocity > 0.4)) goPrev();
    setDragY(0);
  };

  // Mouse drag (desktop)
  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartRef.current = { y: e.clientY, t: Date.now(), moved: false };
    setIsDragging(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const start = mouseStartRef.current;
    if (!start || !isDragging) return;
    const dy = e.clientY - start.y;
    if (Math.abs(dy) > 5) start.moved = true;
    if ((index === 0 && dy > 0) || (index === reels.length - 1 && dy < 0)) setDragY(dy * 0.3);
    else setDragY(dy);
  };
  const onMouseUp = () => {
    const start = mouseStartRef.current;
    mouseStartRef.current = null;
    setIsDragging(false);
    if (!start) return;
    if (!start.moved) {
      setDragY(0);
      return;
    }
    const dt = Date.now() - start.t;
    const velocity = Math.abs(dragY) / Math.max(dt, 1);
    const threshold = 80;
    if (dragY < -threshold || (dragY < -30 && velocity > 0.4)) goNext();
    else if (dragY > threshold || (dragY > 30 && velocity > 0.4)) goPrev();
    setDragY(0);
  };

  // Wheel — debounced so one scroll = one reel
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 20) return;
    const now = Date.now();
    if (now - wheelLockRef.current < 600) return;
    wheelLockRef.current = now;
    if (e.deltaY > 0) goNext();
    else goPrev();
  };

  // Reset video on reel change & track progress + auto-advance
  useEffect(() => {
    const v = videoRef.current;
    setProgress(0);
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    const onTime = () => {
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    const onEnd = () => {
      if (index < reels.length - 1) goNext();
      else {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnd);
    };
  }, [index]);

  // Lock body scroll & key handlers
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        const v = videoRef.current;
        if (v) (v.paused ? v.play() : v.pause());
      } else if (e.key.toLowerCase() === "m") onMuteToggle();
      else if (e.key.toLowerCase() === "l") triggerLike();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/95 backdrop-blur-md animate-fade-in sm:p-4"
      onWheel={onWheel}
      role="dialog"
      aria-modal="true"
      aria-label="Reels viewer"
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute right-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25 sm:right-5 sm:top-5 sm:h-11 sm:w-11"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full bg-background/15 px-3 py-1.5 text-xs font-bold text-background backdrop-blur-md sm:top-5">
        {index + 1} / {reels.length}
      </div>

      {/* Desktop nav arrows */}
      <button
        onClick={goPrev}
        disabled={index === 0}
        aria-label="Previous reel"
        className="absolute right-6 top-1/2 z-40 hidden h-11 w-11 -translate-y-16 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 md:inline-flex"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <button
        onClick={goNext}
        disabled={index === reels.length - 1}
        aria-label="Next reel"
        className="absolute right-6 top-1/2 z-40 hidden h-11 w-11 translate-y-4 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 md:inline-flex"
      >
        <ChevronDown className="h-5 w-5" />
      </button>

      {/* Stage */}
      <div
        className="relative h-full w-full overflow-hidden bg-foreground shadow-2xl select-none sm:h-[min(92vh,860px)] sm:w-auto sm:aspect-[9/16] sm:max-w-[min(92vw,484px)] sm:rounded-3xl sm:border sm:border-background/15"
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
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          onClick={(e) => {
            if (mouseStartRef.current?.moved) return;
            const now = Date.now();
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const last = lastTapRef.current;
            if (last && now - last.t < 300 && Math.hypot(x - last.x, y - last.y) < 50) {
              lastTapRef.current = null;
              triggerLike(x, y);
              return;
            }
            lastTapRef.current = { t: now, x, y };
            setTimeout(() => {
              if (lastTapRef.current && lastTapRef.current.t === now) {
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) v.play();
                else v.pause();
                lastTapRef.current = null;
              }
            }, 280);
          }}
        />

        {/* Veils for legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-foreground/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-foreground via-foreground/85 to-transparent" />

        {/* Progress bar */}
        <div className="absolute left-3 right-3 top-2 z-20 h-0.5 overflow-hidden rounded-full bg-background/20 sm:left-4 sm:right-4">
          <div
            className="h-full rounded-full bg-background transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Live badge */}
        <div className="absolute left-3 top-6 z-20 inline-flex items-center gap-1.5 rounded-full bg-background/15 px-2.5 py-1 text-[10px] font-bold text-background backdrop-blur-md sm:left-4 sm:top-7">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
          </span>
          REEL
        </div>

        {/* Mute */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMuteToggle();
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute right-3 top-6 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25 sm:right-4 sm:top-7"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Floating hearts at tap */}
        {floatingHearts.map((h) => (
          <Heart
            key={h.id}
            className="pointer-events-none absolute z-30 h-20 w-20 -translate-x-1/2 -translate-y-1/2 fill-rose-500 text-rose-500 drop-shadow-2xl animate-scale-in"
            style={{ left: h.x, top: h.y }}
          />
        ))}

        {/* Center burst */}
        {likeBurst && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <Heart className="h-36 w-36 animate-ping fill-rose-500 text-rose-500 opacity-80" />
          </div>
        )}

        {/* Action rail — above bottom info, won't be covered */}
        <div className="absolute bottom-48 right-2 z-30 flex flex-col items-center gap-3 sm:bottom-52 sm:right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isLiked) setLiked((p) => ({ ...p, [reel.id]: false }));
              else triggerLike();
            }}
            aria-label={isLiked ? "Unlike" : "Like"}
            aria-pressed={isLiked}
            className="group flex flex-col items-center gap-1"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/20 text-background backdrop-blur-md transition hover:bg-background/30 group-active:scale-90">
              <Heart className={`h-5 w-5 transition ${isLiked ? "scale-110 fill-rose-500 text-rose-500" : ""}`} />
            </span>
            <span className="text-[10px] font-bold text-background drop-shadow-md">
              {(reel.product.reviews + (isLiked ? 1 : 0)).toLocaleString()}
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            aria-label="Share reel"
            className="group flex flex-col items-center gap-1"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/20 text-background backdrop-blur-md transition hover:bg-background/30 group-active:scale-90">
              <Share2 className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-bold text-background drop-shadow-md">Share</span>
          </button>
        </div>

        {/* Bottom info — leaves room on right for action rail */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-4 pr-16 pt-12 text-background sm:p-5 sm:pr-20">
          <p className="mb-3 line-clamp-2 text-sm font-semibold sm:text-base">{reel.caption}</p>
          <div className="rounded-2xl border border-background/20 bg-background/10 p-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <img
                src={reel.product.image}
                alt={reel.product.title}
                className="h-12 w-12 shrink-0 rounded-xl object-cover sm:h-14 sm:w-14"
              />
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">
                  {reel.product.category}
                </span>
                <h4 className="mt-1 truncate text-sm font-bold text-background">{reel.product.title}</h4>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-base font-extrabold text-background sm:text-lg">৳{reel.product.price}</span>
                  <span className="text-xs text-background/50 line-through">৳{reel.product.oldPrice}</span>
                  <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    -{off}%
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  add(reel.product);
                  toast.success(`${reel.product.title} added`);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-background/30 bg-background/10 px-3 py-2.5 text-xs font-bold text-background backdrop-blur-md transition hover:bg-background/20"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  add(reel.product);
                  navigate({ to: "/checkout" });
                  onClose();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-lg transition hover:scale-[1.03]"
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
  const { data: allProducts = [] } = useProducts();
  const reels = useMemo(() => buildReels(allProducts), [allProducts]);

  if (reels.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/40 to-background">
      <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Video className="h-3 w-3" /> Watch &amp; Shop
            </span>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-3xl">
              See it live, <span className="text-primary">shop instantly</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              Tap the expand icon for full view — swipe, scroll, or use arrow keys to browse
            </p>
          </div>
        </div>

        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">
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
          reels={reels}
        />
      )}
    </section>
  );
}
