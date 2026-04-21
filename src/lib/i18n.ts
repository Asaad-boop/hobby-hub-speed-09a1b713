import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGS = ["en", "bn"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = "hobbyshop_lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "bn") return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

const resources = {
  en: {
    translation: {
      common: {
        signIn: "Sign in",
        account: "Account",
        admin: "Admin",
        search: "Search",
        searchPlaceholder: "Search gadgets, gifts, decor…",
        cart: "Cart",
        wishlist: "Wishlist",
        all: "All Products",
        homeDecor: "Home Decor",
        gadgets: "Gadgets 🔥",
        diyKits: "DIY Kits",
        freeDelivery: "Free delivery on orders over",
        cashOnDelivery: "Cash on Delivery",
        addToCart: "Add to Cart",
        buyNow: "Buy Now",
        viewAll: "View all",
        loading: "Loading…",
      },
      footer: {
        shop: "Shop",
        help: "Help",
        getInTouch: "Get in Touch",
        about: "About Us",
        contact: "Contact",
        requestProduct: "Request a Product",
        shippingInfo: "Shipping Info",
        returns: "Returns & Refunds",
        faq: "FAQ",
        privacy: "Privacy",
        terms: "Terms",
        madeIn: "Made with love in Bangladesh",
        newsletter: "Get flash sales, new arrivals & exclusive deals — no spam, ever.",
        subscribe: "Subscribe",
        rights: "All rights reserved.",
      },
      cart: {
        title: "Your Cart",
        empty: "Your cart is empty",
        subtotal: "Subtotal",
        checkout: "Checkout",
        continueShopping: "Continue shopping",
      },
      product: {
        inStock: "In stock",
        outOfStock: "Out of stock",
        select: "Please select",
        reviews: "reviews",
      },
    },
  },
  bn: {
    translation: {
      common: {
        signIn: "সাইন ইন",
        account: "অ্যাকাউন্ট",
        admin: "অ্যাডমিন",
        search: "খুঁজুন",
        searchPlaceholder: "গ্যাজেট, গিফট, ডেকর খুঁজুন…",
        cart: "কার্ট",
        wishlist: "উইশলিস্ট",
        all: "সব পণ্য",
        homeDecor: "হোম ডেকর",
        gadgets: "গ্যাজেট 🔥",
        diyKits: "DIY কিট",
        freeDelivery: "ফ্রি ডেলিভারি অর্ডারে",
        cashOnDelivery: "ক্যাশ অন ডেলিভারি",
        addToCart: "কার্টে যোগ করুন",
        buyNow: "এখনই কিনুন",
        viewAll: "সব দেখুন",
        loading: "লোড হচ্ছে…",
      },
      footer: {
        shop: "শপ",
        help: "সাহায্য",
        getInTouch: "যোগাযোগ",
        about: "আমাদের সম্পর্কে",
        contact: "যোগাযোগ",
        requestProduct: "পণ্য অনুরোধ করুন",
        shippingInfo: "শিপিং তথ্য",
        returns: "রিটার্ন ও রিফান্ড",
        faq: "FAQ",
        privacy: "প্রাইভেসি",
        terms: "শর্তাবলী",
        madeIn: "ভালোবাসা দিয়ে তৈরি — বাংলাদেশে",
        newsletter: "ফ্ল্যাশ সেল, নতুন পণ্য ও স্পেশাল ডিল পান — কোনো স্প্যাম নয়।",
        subscribe: "সাবস্ক্রাইব",
        rights: "সর্বস্বত্ব সংরক্ষিত।",
      },
      cart: {
        title: "আপনার কার্ট",
        empty: "আপনার কার্ট খালি",
        subtotal: "সাবটোটাল",
        checkout: "চেকআউট",
        continueShopping: "শপিং চালিয়ে যান",
      },
      product: {
        inStock: "স্টকে আছে",
        outOfStock: "স্টকে নেই",
        select: "নির্বাচন করুন",
        reviews: "রিভিউ",
      },
    },
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: detectInitialLang(),
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

export function setLanguage(lang: Lang) {
  i18n.changeLanguage(lang);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      /* ignore */
    }
  }
}

export function getCurrentLang(): Lang {
  return (i18n.language as Lang) || "en";
}

export default i18n;
