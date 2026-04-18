import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — HobbyShop" },
      { name: "description", content: "How HobbyShop collects, uses and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — HobbyShop" },
      { property: "og:description", content: "Your privacy matters. Learn how we handle your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3 w-3" /> Your Privacy
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">Privacy Policy</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: April 2026</p>
      </div>

      <div className="prose prose-sm mt-10 max-w-none space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-bold">1. Information We Collect</h2>
          <p className="mt-2 text-muted-foreground">
            We collect information you provide directly — name, email, phone number, shipping address —
            when you place an order, create an account, or contact support. We also collect basic
            technical data (IP, browser type, pages viewed) to improve our service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">2. How We Use Your Information</h2>
          <p className="mt-2 text-muted-foreground">
            Your data is used to process orders, deliver products, send order updates, respond to
            inquiries, and improve our website. With your consent, we may also send marketing emails
            about new arrivals and offers — you can unsubscribe anytime.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">3. Sharing Your Information</h2>
          <p className="mt-2 text-muted-foreground">
            We never sell your personal data. We share information only with trusted partners required
            to fulfill your order — couriers, payment processors — and only the minimum needed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">4. Cookies</h2>
          <p className="mt-2 text-muted-foreground">
            We use cookies to keep you logged in, remember your cart, and analyze site traffic. You can
            disable cookies in your browser, but some features may not work properly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">5. Data Security</h2>
          <p className="mt-2 text-muted-foreground">
            We protect your data using industry-standard encryption and secure storage. Payment details
            are processed directly by certified payment gateways and never stored on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">6. Your Rights</h2>
          <p className="mt-2 text-muted-foreground">
            You can request access, correction, or deletion of your personal data at any time by
            emailing us at <a href="mailto:hello@hobbyshop.com" className="text-primary hover:underline">hello@hobbyshop.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">7. Changes to This Policy</h2>
          <p className="mt-2 text-muted-foreground">
            We may update this policy from time to time. The "Last updated" date at the top reflects
            the most recent changes. Continued use of our site means you accept the updated policy.
          </p>
        </section>
      </div>
    </div>
  );
}
