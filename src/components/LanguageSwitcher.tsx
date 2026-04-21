import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { setLanguage, getCurrentLang, type Lang } from "@/lib/i18n";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(getCurrentLang());
  }, []);

  const toggle = () => {
    const next: Lang = lang === "en" ? "bn" : "en";
    setLanguage(next);
    setLang(next);
  };

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label="Switch language"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95 md:h-11 md:w-11"
        title={lang === "en" ? "বাংলা" : "English"}
      >
        <Globe className="h-[18px] w-[18px]" />
        <span className="sr-only">{lang === "en" ? "Switch to Bangla" : "Switch to English"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold transition hover:border-primary/50 hover:text-primary"
      aria-label="Switch language"
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === "en" ? "EN" : "বাং"}
    </button>
  );
}
