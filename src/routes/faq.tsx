import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, MessageCircle, Languages } from "lucide-react";
import { useState } from "react";
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
      { name: "description", content: "Answers to common questions about ordering, payment, shipping, returns and more — in English and Bangla." },
      { property: "og:title", content: "FAQ — HobbyShop" },
      { property: "og:description", content: "Find answers to common questions about HobbyShop." },
    ],
  }),
  component: FaqPage,
});

type FaqGroup = {
  cat: { en: string; bn: string };
  items: { q: { en: string; bn: string }; a: { en: string; bn: string } }[];
};

const faqs: FaqGroup[] = [
  {
    cat: { en: "Ordering", bn: "অর্ডার" },
    items: [
      {
        q: { en: "How do I place an order?", bn: "কীভাবে অর্ডার করব?" },
        a: {
          en: "Browse our shop, add items to your cart, then proceed to checkout. You can pay online or choose Cash on Delivery.",
          bn: "আমাদের শপ ব্রাউজ করুন, কার্টে প্রোডাক্ট যোগ করুন, তারপর চেকআউটে যান। অনলাইনে পেমেন্ট অথবা ক্যাশ অন ডেলিভারি বেছে নিতে পারবেন।",
        },
      },
      {
        q: { en: "Can I modify or cancel my order?", bn: "অর্ডার পরিবর্তন বা বাতিল করতে পারব?" },
        a: {
          en: "Yes — within 1 hour of placing it. Contact our support team via WhatsApp or phone for fast changes.",
          bn: "হ্যাঁ — অর্ডার দেওয়ার ১ ঘণ্টার মধ্যে সম্ভব। দ্রুত পরিবর্তনের জন্য WhatsApp বা ফোনে আমাদের সাপোর্ট টিমে যোগাযোগ করুন।",
        },
      },
      {
        q: { en: "Do I need an account to order?", bn: "অর্ডার করতে কি অ্যাকাউন্ট লাগবে?" },
        a: {
          en: "No, you can checkout as a guest. Creating an account just makes it easier to track orders and reorder.",
          bn: "না, আপনি গেস্ট হিসেবেও চেকআউট করতে পারবেন। অ্যাকাউন্ট থাকলে অর্ডার ট্র্যাক ও রি-অর্ডার করা সহজ হয়।",
        },
      },
    ],
  },
  {
    cat: { en: "Payment", bn: "পেমেন্ট" },
    items: [
      {
        q: { en: "What payment methods do you accept?", bn: "কী কী পেমেন্ট মেথড গ্রহণ করেন?" },
        a: {
          en: "Cash on Delivery (nationwide), bKash, Nagad, Rocket, and major credit/debit cards.",
          bn: "ক্যাশ অন ডেলিভারি (সারাদেশে), bKash, Nagad, Rocket এবং জনপ্রিয় ক্রেডিট/ডেবিট কার্ড।",
        },
      },
      {
        q: { en: "Is online payment safe?", bn: "অনলাইন পেমেন্ট কি নিরাপদ?" },
        a: {
          en: "Yes. All transactions are encrypted and processed through trusted payment gateways.",
          bn: "হ্যাঁ। সব লেনদেন এনক্রিপ্টেড এবং বিশ্বস্ত পেমেন্ট গেটওয়ের মাধ্যমে প্রসেস হয়।",
        },
      },
      {
        q: { en: "Do you charge any extra fees?", bn: "অতিরিক্ত কোনো ফি আছে?" },
        a: {
          en: "No hidden fees. The price you see at checkout is exactly what you pay.",
          bn: "কোনো লুকানো ফি নেই। চেকআউটে যে দাম দেখবেন, ঠিক সেটাই দিতে হবে।",
        },
      },
    ],
  },
  {
    cat: { en: "Shipping", bn: "ডেলিভারি" },
    items: [
      {
        q: { en: "How long does delivery take?", bn: "ডেলিভারি পেতে কত সময় লাগে?" },
        a: {
          en: "Inside Dhaka: 1–2 business days. Outside Dhaka: 3–5 business days depending on location.",
          bn: "ঢাকার ভেতরে: ১–২ কর্মদিবস। ঢাকার বাইরে: লোকেশনভেদে ৩–৫ কর্মদিবস।",
        },
      },
      {
        q: { en: "Do you ship nationwide?", bn: "সারাদেশে ডেলিভারি দেন?" },
        a: {
          en: "Yes, we deliver to all 64 districts of Bangladesh.",
          bn: "হ্যাঁ, আমরা বাংলাদেশের ৬৪টি জেলাতেই ডেলিভারি দিই।",
        },
      },
      {
        q: { en: "What are the shipping charges?", bn: "ডেলিভারি চার্জ কত?" },
        a: {
          en: "FREE for orders over ৳1990. Inside Dhaka ৳60–৳100, outside Dhaka ৳110–৳200 — depends on product and weight.",
          bn: "৳১৯৯০-এর বেশি অর্ডারে ফ্রি। ঢাকার ভেতরে ৳৬০–৳১০০, ঢাকার বাইরে ৳১১০–৳২০০ — প্রোডাক্ট ও ওজনের উপর নির্ভর করে।",
        },
      },
    ],
  },
  {
    cat: { en: "Returns", bn: "রিটার্ন" },
    items: [
      {
        q: { en: "What is your return policy?", bn: "রিটার্ন পলিসি কী?" },
        a: {
          en: "We offer 7-day easy returns on most items. The product must be unused and in original packaging.",
          bn: "বেশিরভাগ প্রোডাক্টে ৭ দিনের সহজ রিটার্ন সুবিধা আছে। প্রোডাক্ট অবশ্যই অব্যবহৃত এবং অরিজিনাল প্যাকেজিংয়ে থাকতে হবে।",
        },
      },
      {
        q: { en: "How do I return a product?", bn: "কীভাবে প্রোডাক্ট রিটার্ন করব?" },
        a: {
          en: "Contact our support team within 7 days of delivery. We'll arrange a pickup and process your refund.",
          bn: "ডেলিভারির ৭ দিনের মধ্যে আমাদের সাপোর্ট টিমে যোগাযোগ করুন। আমরা পিকআপের ব্যবস্থা করব এবং রিফান্ড প্রসেস করব।",
        },
      },
      {
        q: { en: "When will I get my refund?", bn: "রিফান্ড কখন পাব?" },
        a: {
          en: "Refunds are processed within 3-5 business days after we receive the returned item.",
          bn: "রিটার্ন প্রোডাক্ট আমাদের কাছে পৌঁছানোর ৩-৫ কর্মদিবসের মধ্যে রিফান্ড প্রসেস করা হয়।",
        },
      },
    ],
  },
];

const t = {
  en: {
    badge: "Help Center",
    title: ["Frequently Asked", "Questions"],
    sub: "Quick answers to the most common questions. Can't find yours? Just ask us.",
    still: "Still have questions?",
    stillSub: "Our friendly team is just a message away.",
    contact: "Contact Support",
    langLabel: "Read in your language",
  },
  bn: {
    badge: "হেল্প সেন্টার",
    title: ["সাধারণ", "প্রশ্নোত্তর"],
    sub: "সাধারণ প্রশ্নগুলোর দ্রুত উত্তর। উত্তর পাচ্ছেন না? আমাদের জিজ্ঞেস করুন।",
    still: "এখনো প্রশ্ন আছে?",
    stillSub: "আমাদের সাপোর্ট টিম এক মেসেজ দূরে।",
    contact: "সাপোর্টে যোগাযোগ",
    langLabel: "আপনার ভাষায় পড়ুন",
  },
};

function FaqPage() {
  const [lang, setLang] = useState<"en" | "bn">("en");
  const c = t[lang];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <HelpCircle className="h-3 w-3" /> {c.badge}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          {c.title[0]} <span className="text-primary">{c.title[1]}</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">{c.sub}</p>
      </div>

      {/* Language toggle */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Languages className="h-4 w-4 text-primary" /> {c.langLabel}
        </div>
        <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
          <button
            onClick={() => setLang("en")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              lang === "en" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang("bn")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              lang === "bn" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {faqs.map((group) => (
          <div key={group.cat.en}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">{group.cat[lang]}</h2>
            <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-4 shadow-[var(--shadow-card)]">
              {group.items.map((item, i) => (
                <AccordionItem key={i} value={`${group.cat.en}-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline md:text-base">
                    {item.q[lang]}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.a[lang]}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center md:p-8">
        <MessageCircle className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 text-xl font-bold">{c.still}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.stillSub}</p>
        <Link to="/contact" className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
          {c.contact}
        </Link>
      </div>
    </div>
  );
}
