import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, Phone, MapPin, MessageCircle, Send, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — HobbyShop" },
      { name: "description", content: "Get in touch with HobbyShop. Phone, email, WhatsApp and live support across Bangladesh." },
      { property: "og:title", content: "Contact Us — HobbyShop" },
      { property: "og:description", content: "Reach our team for orders, returns and product help." },
    ],
  }),
  component: ContactPage,
});

const channels = [
  { icon: Phone, label: "Call us", value: "09638779900", href: "tel:09638779900" },
  { icon: MessageCircle, label: "WhatsApp", value: "+880 1865-230553", href: "https://wa.me/8801865230553" },
  { icon: Mail, label: "Email", value: "support@hobbyshopbd.com", href: "mailto:support@hobbyshopbd.com" },
  { icon: MapPin, label: "Visit", value: "Dhaka, Bangladesh" },
];

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message is too long"),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Message sent! We'll reply within 24 hours.");
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 600);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <MessageCircle className="h-3 w-3" /> Let's Talk
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          We're here to <span className="text-primary">help</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          Questions about an order, product or return? Our team replies fast — usually within a few hours.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
        {/* Contact channels */}
        <div className="space-y-4 lg:col-span-2">
          {channels.map(({ icon: Icon, label, value, href }) => {
            const content = (
              <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</div>
                </div>
              </div>
            );
            return href ? (
              <a key={label} href={href} className="block">
                {content}
              </a>
            ) : (
              <div key={label}>{content}</div>
            );
          })}

          <div className="flex items-start gap-4 rounded-2xl border border-border bg-muted/40 p-5">
            <Clock className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <div className="font-bold text-foreground">Support hours</div>
              <div className="text-muted-foreground">Sat – Thu, 10:00 AM – 9:00 PM</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] lg:col-span-3 md:p-8"
        >
          <h2 className="text-xl font-bold">Send us a message</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">Your Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold text-foreground">Subject</label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="How can we help?"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold text-foreground">Message *</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Tell us more..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/85 px-7 text-sm font-bold text-primary-foreground shadow-md transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4" /> {loading ? "Sending…" : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
