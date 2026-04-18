import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Send, Languages, Upload, X, Link as LinkIcon, Tag, User, Phone, Package, ArrowLeft } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request a Product — HobbyShop" },
      { name: "description", content: "Didn't find what you love? Tell us the product, share a reference link, image and price — we'll try to bring it for you." },
      { property: "og:title", content: "Request a Product — HobbyShop" },
      { property: "og:description", content: "Send us your product wishlist with image, link and price. We'll source it for you." },
    ],
  }),
  component: RequestPage,
});

const t = {
  en: {
    badge: "Product Request",
    title: ["Didn't find what you", "love?"],
    sub: "Tell us what you're looking for — share a reference link, image and price, and we'll try to bring it for you.",
    back: "Back to About",
    name: "Your name",
    contact: "Phone or email",
    product: "Product name",
    link: "Reference link (Daraz, Amazon, AliExpress…)",
    price: "Target price (৳)",
    notes: "Extra details — color, size, brand, etc.",
    image: "Reference image (optional)",
    imageHint: "PNG, JPG up to 5MB",
    chooseFile: "Choose image",
    remove: "Remove",
    submit: "Send Request",
    sending: "Sending…",
    required: "Please fill in name, contact and product name.",
    fileTooBig: "Image must be under 5MB.",
    success: "Request received! We'll reach out within 24 hours 💌",
    helpTitle: "How it works",
    steps: [
      "You send us the product details below.",
      "We check availability & sourcing cost.",
      "We message you back with the final price & ETA.",
      "You confirm — we order & deliver to your door.",
    ],
  },
  bn: {
    badge: "প্রোডাক্ট রিকোয়েস্ট",
    title: ["আপনি যেটা খুঁজছেন", "সেটা পাননি?"],
    sub: "আপনার পছন্দের প্রোডাক্ট আমাদের জানান — রেফারেন্স লিংক, ছবি ও দাম দিন, আমরা আপনার জন্য নিয়ে আসার চেষ্টা করবো।",
    back: "About-এ ফিরে যান",
    name: "আপনার নাম",
    contact: "ফোন অথবা ইমেইল",
    product: "প্রোডাক্টের নাম",
    link: "রেফারেন্স লিংক (Daraz, Amazon, AliExpress…)",
    price: "টার্গেট দাম (৳)",
    notes: "অতিরিক্ত তথ্য — রঙ, সাইজ, ব্র্যান্ড ইত্যাদি",
    image: "রেফারেন্স ছবি (ঐচ্ছিক)",
    imageHint: "PNG, JPG সর্বোচ্চ ৫MB",
    chooseFile: "ছবি বাছাই করুন",
    remove: "মুছুন",
    submit: "রিকোয়েস্ট পাঠান",
    sending: "পাঠানো হচ্ছে…",
    required: "দয়া করে নাম, যোগাযোগ ও প্রোডাক্টের নাম পূরণ করুন।",
    fileTooBig: "ছবি ৫MB-এর কম হতে হবে।",
    success: "রিকোয়েস্ট পেয়েছি! ২৪ ঘণ্টার মধ্যে যোগাযোগ করব 💌",
    helpTitle: "কীভাবে কাজ করে",
    steps: [
      "নিচে প্রোডাক্টের ডিটেইলস পাঠান।",
      "আমরা স্টক ও সোর্সিং খরচ চেক করব।",
      "চূড়ান্ত দাম ও ডেলিভারি টাইম জানাব।",
      "কনফার্ম করলে — আমরা অর্ডার করে ডেলিভারি দেব।",
    ],
  },
};

function RequestPage() {
  const [lang, setLang] = useState<"en" | "bn">("en");
  const c = t[lang];

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [product, setProduct] = useState("");
  const [link, setLink] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(c.fileTooBig);
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !product.trim()) {
      toast.error(c.required);
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success(c.success);
      setName("");
      setContact("");
      setProduct("");
      setLink("");
      setPrice("");
      setNotes("");
      removeImage();
      setSubmitting(false);
    }, 700);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <Link to="/about" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> {c.back}
      </Link>

      {/* Header */}
      <div className="mt-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Search className="h-3 w-3" /> {c.badge}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          {c.title[0]} <span className="text-primary">{c.title[1]}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{c.sub}</p>
      </div>

      {/* Language toggle */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Languages className="h-4 w-4 text-primary" />
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

      <div className="mt-10 grid gap-8 md:grid-cols-5 md:gap-10">
        {/* How it works */}
        <aside className="md:col-span-2">
          <div className="sticky top-24 rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-extrabold">{c.helpTitle}</h2>
            <ol className="mt-4 space-y-3">
              {c.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:col-span-3 md:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={User} value={name} onChange={setName} placeholder={c.name} maxLength={100} />
            <Field icon={Phone} value={contact} onChange={setContact} placeholder={c.contact} maxLength={120} />
          </div>

          <Field icon={Package} value={product} onChange={setProduct} placeholder={c.product} maxLength={150} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={LinkIcon} value={link} onChange={setLink} placeholder={c.link} type="url" maxLength={500} />
            <Field icon={Tag} value={price} onChange={setPrice} placeholder={c.price} type="number" maxLength={10} />
          </div>

          {/* Image upload */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {c.image}
            </label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Reference preview" className="h-40 w-40 rounded-xl border border-border object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:scale-110"
                  aria-label={c.remove}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <Upload className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-bold">{c.chooseFile}</div>
                  <div className="text-[11px]">{c.imageHint}</div>
                </div>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickImage} className="hidden" />
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={c.notes}
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md transition hover:scale-[1.02] disabled:opacity-60 sm:w-auto"
          >
            <Send className="h-4 w-4" />
            {submitting ? c.sending : c.submit}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  icon: typeof User;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
