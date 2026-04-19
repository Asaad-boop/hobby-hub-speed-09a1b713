import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — HobbyShop" },
      { name: "description", content: "The rules and terms that apply when you use HobbyShop." },
      { property: "og:title", content: "Terms of Service — HobbyShop" },
      { property: "og:description", content: "Terms and conditions for using HobbyShop." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <FileText className="h-3 w-3" /> Legal
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">Terms of Service</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: April 2026</p>
      </div>

      <div className="mt-10 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold">1. Acceptance of Terms</h2>
          <p className="mt-2 text-muted-foreground">
            By accessing or using HobbyShop, you agree to be bound by these Terms of Service. If you do
            not agree, please do not use our website.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">2. Eligibility</h2>
          <p className="mt-2 text-muted-foreground">
            You must be at least 18 years old (or have parental consent) to place orders. By ordering,
            you confirm that all information provided is accurate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">3. Products & Pricing</h2>
          <p className="mt-2 text-muted-foreground">
            We strive to display accurate product information and prices. Occasional errors may occur —
            we reserve the right to correct them and cancel any affected orders with a full refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">4. Orders & Payment</h2>
          <p className="mt-2 text-muted-foreground">
            All orders are subject to acceptance and stock availability. Payment must be completed (or
            COD confirmed) before we ship your order.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">5. Shipping & Returns</h2>
          <p className="mt-2 text-muted-foreground">
            See our <a href="/shipping" className="text-primary hover:underline">Shipping & Returns</a> page
            for full details on delivery times, fees, and our 7-day return policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">6. Intellectual Property</h2>
          <p className="mt-2 text-muted-foreground">
            All content on this site — text, images, logos, code — is owned by HobbyShop or its
            licensors and protected by copyright. You may not reuse content without permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">7. User Conduct</h2>
          <p className="mt-2 text-muted-foreground">
            You agree not to misuse the site, attempt to access restricted areas, or use it for any
            unlawful purpose. We reserve the right to suspend accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">8. Limitation of Liability</h2>
          <p className="mt-2 text-muted-foreground">
            HobbyShop is not liable for indirect or consequential damages arising from your use of the
            site or products purchased, beyond the value of the order itself.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">9. Governing Law</h2>
          <p className="mt-2 text-muted-foreground">
            These terms are governed by the laws of Bangladesh. Any disputes will be resolved in the
            courts of Dhaka.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">10. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions? Email <a href="mailto:support@hobbyshopbd.com" className="text-primary hover:underline">support@hobbyshopbd.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
