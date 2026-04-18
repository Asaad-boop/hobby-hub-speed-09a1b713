import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Play, Pause, Volume2, VolumeX, ShoppingBag, Zap, Star, Video } from "lucide-react";
import { products, newArrivals, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import reelLamp from "@/assets/reel-lamp.mp4.asset.json";
import reelCharger from "@/assets/reel-charger.mp4.asset.json";
import reelSpeaker from "@/assets/reel-speaker.mp4.asset.json";
import reelDiffuser from "@/assets/reel-diffuser.mp4.asset.json";

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
  {
    id: "r1",
    videoUrl: reelLamp.url,
    caption: "Cozy vibes only ✨",
    product: findProduct("crystal-lamp"),
  },
  {
    id: "r2",
    videoUrl: reelCharger.url,
    caption: "Snap. Charge. Done. ⚡",
    product: findProduct("magsafe-charger"),
  },
  {
    id: "r3",
    videoUrl: reelSpeaker.url,
    caption: "Big sound, tiny size 🔊",
    product: findProduct("mini-speaker"),
  },
  {
    id: "r4",
    videoUrl: reelDiffuser.url,
    caption: "Relax mode: ON 🌿",
    product: findProduct("aroma-diffuser"),
  },
];

function ReelCard({ reel, muted, onUnmute }: { reel: Reel; muted: boolean; onUnmute: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { add } = useCart();
  const navigate = useNavigate();
  const off = Math.round(((reel.product.oldPrice - reel.product.price) / reel.product.oldPrice) * 100);

  // Auto play/pause on viewport intersection
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
      {/* Video */}
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

      {/* Top gradient + controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/70 to-transparent" />
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/15 px-2.5 py-1 text-[10px] font-bold text-background backdrop-blur-md">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
        </span>
        REEL
      </div>
      <button
        onClick={onUnmute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Center play indicator */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg transition hover:scale-110">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </span>
        </button>
      )}

      {/* Bottom info & shop */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground via-foreground/85 to-transparent p-3 pt-10 text-background">
        <p className="mb-2 line-clamp-2 text-sm font-semibold">{reel.caption}</p>

        {/* Product mini card */}
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

export default function WatchAndShop() {
  const [muted, setMuted] = useState(true);

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
              Real product reels — tap any reel to add to cart or buy now
            </p>
          </div>
        </div>

        {/* Reels rail */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">
          {reels.map((r) => (
            <ReelCard key={r.id} reel={r} muted={muted} onUnmute={() => setMuted((m) => !m)} />
          ))}
        </div>
      </div>
    </section>
  );
}
