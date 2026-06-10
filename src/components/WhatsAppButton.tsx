import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Facebook } from "lucide-react";
import { useSiteSettings } from "@/lib/site-settings";

const WHATSAPP_NUMBER_FALLBACK = "8801964437520";
const FACEBOOK_PAGE_URL = "https://www.facebook.com/hobbyshopbd.shop";
const MESSENGER_URL = "https://m.me/hobbyshopbd.shop";

export default function WhatsAppButton() {
  const { data: settings } = useSiteSettings();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const number =
    (settings?.whatsapp_number ?? "").replace(/[^0-9]/g, "") ||
    WHATSAPP_NUMBER_FALLBACK;
  const message = settings?.whatsapp_message ?? "";
  const whatsappHref = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-44 right-3 z-20 lg:bottom-6 lg:right-6"
    >
      {/* Action menu */}
      <div
        className={`absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2 transition-all duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        {/* Messenger */}
        <a
          href={MESSENGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Message us on Facebook"
          className="group flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="rounded-full bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-md ring-1 ring-border">
            Facebook Page
          </span>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.55_0.22_265)] text-white shadow-[0_8px_20px_-6px_oklch(0.55_0.22_265/0.6)] transition-transform group-hover:scale-110">
            <Facebook className="h-5 w-5" fill="currentColor" />
          </span>
        </a>

        {/* WhatsApp */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="group flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="rounded-full bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-md ring-1 ring-border">
            WhatsApp
          </span>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.65_0.18_150)] text-white shadow-[0_8px_20px_-6px_oklch(0.65_0.18_150/0.6)] transition-transform group-hover:scale-110">
            <MessageCircle className="h-5 w-5" fill="currentColor" />
          </span>
        </a>

        {/* Visit Facebook Page */}
        <a
          href={FACEBOOK_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit our Facebook page"
          className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground"
          onClick={() => setOpen(false)}
        >
          Visit FB Page →
        </a>
      </div>

      {/* Main FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close chat options" : "Open chat options"}
        className="group relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.65_0.18_150)] text-white shadow-[0_12px_32px_-8px_oklch(0.65_0.18_150/0.6)] transition-all hover:scale-110 active:scale-95 lg:h-16 lg:w-16"
      >
        {!open && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[oklch(0.65_0.18_150)] opacity-30" />
        )}
        {open ? (
          <X className="h-6 w-6 lg:h-7 lg:w-7" />
        ) : (
          <MessageCircle
            className="h-6 w-6 transition-transform group-hover:rotate-12 lg:h-8 lg:w-8"
            fill="currentColor"
          />
        )}
      </button>
    </div>
  );
}
