import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/lib/site-settings";

export default function WhatsAppButton() {
  const { data: settings } = useSiteSettings();
  const number = (settings?.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const message = settings?.whatsapp_message ?? "";
  if (!number) return null;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-36 right-3 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.65_0.18_150)] text-white shadow-[0_12px_32px_-8px_oklch(0.65_0.18_150/0.6)] transition-all hover:scale-110 active:scale-95 lg:bottom-6 lg:right-6 lg:h-16 lg:w-16"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[oklch(0.65_0.18_150)] opacity-30" />
      <MessageCircle className="h-7 w-7 transition-transform group-hover:rotate-12 lg:h-8 lg:w-8" fill="currentColor" />
    </a>
  );
}
