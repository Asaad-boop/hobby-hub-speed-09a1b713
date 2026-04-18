import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — HobbyShop" },
      { name: "description", content: "Answers to common questions about ordering, payment, shipping, returns and more." },
      { property: "og:title", content: "FAQ — HobbyShop" },
      { property: "og:description", content: "Find answers to common questions about HobbyShop." },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    cat: "Ordering",
    items: [
      { q: "How do I place an order?", a: "Browse our shop, add items to your cart, then proceed to checkout. You can pay online or choose Cash on Delivery." },
      { q: "Can I modify or cancel my order?", a: "Yes — within 1 hour of placing it. Contact our support team via WhatsApp or phone for fast changes." },
      { q: "Do I need an account to order?", a: "No, you can checkout as a guest. Creating an account just makes it easier to track orders and reorder." },
    ],
  },
  {
    cat: "Payment",
    items: [
      { q: "What payment methods do you accept?", a: "Cash on Delivery (nationwide), bKash, Nagad, Rocket, and major credit/debit cards." },
      { q: "Is online payment safe?", a: "Yes. All transactions are encrypted and processed through trusted payment gateways." },
      { q: "Do you charge any extra fees?", a: "No hidden fees. The price you see at checkout is exactly what you pay." },
    ],
  },
  {
    cat: "Shipping",
    items: [
      { q: "How long does delivery take?", a: "Inside Dhaka: 1-2 business days. Outside Dhaka: 2-5 business days depending on location." },
      { q: "Do you ship nationwide?", a: "Yes, we deliver to all 64 districts of Bangladesh." },
      { q: "Is shipping free?", a: "Yes — for orders over ৳1500. Below that, a small delivery fee applies based on your location." },
    ],
  },
  {
    cat: "Returns",
    items: [
      { q: "What is your return policy?", a: "We offer 7-day easy returns on most items. The product must be unused and in original packaging." },
      { q: "How do I return a product?", a: "Contact our support team within 7 days of delivery. We'll arrange a pickup and process your refund." },
      { q: "When will I get my refund?", a: "Refunds are processed within 3-5 business days after we receive the returned item." },
    ],
  },
];

function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <HelpCircle className="h-3 w-3" /> Help Center
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          Frequently Asked <span className="text-primary">Questions</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Quick answers to the most common questions. Can't find yours? Just ask us.
        </p>
      </div>

      <div className="mt-10 space-y-8">
        {faqs.map((group) => (
          <div key={group.cat}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">{group.cat}</h2>
            <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-4 shadow-[var(--shadow-card)]">
              {group.items.map((item, i) => (
                <AccordionItem key={i} value={`${group.cat}-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline md:text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center md:p-8">
        <MessageCircle className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 text-xl font-bold">Still have questions?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Our friendly team is just a message away.</p>
        <Link to="/contact" className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
          Contact Support
        </Link>
      </div>
    </div>
  );
}
