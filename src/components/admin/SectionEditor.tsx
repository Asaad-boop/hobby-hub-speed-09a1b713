import {
  type HomepageSection,
  type SectionType,
  SECTION_LABELS,
} from "@/lib/site-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "./ImageUploader";
import ProductPicker from "./ProductPicker";
import ReelsManager from "./ReelsManager";
import { Plus, Trash2 } from "lucide-react";
import { useSiteSettings, type SiteSettings } from "@/lib/site-settings";

type Patch = (patch: Partial<HomepageSection> | ((s: HomepageSection) => HomepageSection)) => void;

export default function SectionEditor({
  section,
  onChange,
  settings,
  onSettingsChange,
}: {
  section: HomepageSection;
  onChange: Patch;
  settings: SiteSettings;
  onSettingsChange: <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => void;
}) {
  const setCfg = (key: string, value: unknown) =>
    onChange((s) => ({ ...s, config: { ...s.config, [key]: value } }));

  const cfg = <T,>(k: string, fb: T): T => {
    const v = section.config?.[k];
    return (v === undefined || v === null ? fb : v) as T;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Section type
          </p>
          <p className="truncate text-sm font-bold">{SECTION_LABELS[section.type]}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`enabled-${section.id}`} className="text-xs font-semibold">
            Enabled
          </Label>
          <Switch
            id={`enabled-${section.id}`}
            checked={section.enabled}
            onCheckedChange={(v) => onChange({ enabled: v })}
          />
        </div>
      </div>

      {renderEditor(section.type, cfg, setCfg, settings, onSettingsChange)}

      {/* ===== Universal style controls ===== */}
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Style · spacing & background
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Padding top (px)">
            <Input
              type="number"
              min={0}
              max={300}
              value={cfg<number | "">("pad_top", "")}
              placeholder="auto"
              onChange={(e) =>
                setCfg("pad_top", e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </Field>
          <Field label="Padding bottom (px)">
            <Input
              type="number"
              min={0}
              max={300}
              value={cfg<number | "">("pad_bottom", "")}
              placeholder="auto"
              onChange={(e) =>
                setCfg("pad_bottom", e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </Field>
        </div>
        <div className="mt-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Background color
          </Label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              value={cfg<string>("bg_color", "") || "#ffffff"}
              onChange={(e) => setCfg("bg_color", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
              aria-label="Pick background color"
            />
            <Input
              value={cfg<string>("bg_color", "")}
              placeholder="#ffffff or rgba(...)"
              onChange={(e) => setCfg("bg_color", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCfg("bg_color", "")}
            >
              Clear
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Khali rakhle section er default background thakbe.
          </p>
        </div>
      </div>
    </div>
  );
}

function renderEditor(
  type: SectionType,
  cfg: <T,>(k: string, fb: T) => T,
  setCfg: (k: string, v: unknown) => void,
  settings: SiteSettings,
  onSettingsChange: <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => void,
) {
  switch (type) {
    case "hero":
      return (
        <Field label="Hero showcase products (max 6)" hint="Khali rakhle prothom 4 product use hobe.">
          <ProductPicker
            value={settings.hero_product_ids}
            onChange={(ids) => onSettingsChange("hero_product_ids", ids)}
            max={6}
            emptyHint="Pick up to 6 products."
          />
        </Field>
      );

    case "banner":
      return (
        <>
          <Field label="Banner image" hint="Recommended size 1600×400. Khali rakhle hide thakbe.">
            <ImageUploader
              value={cfg("image_url", "") || settings.homepage_banner_url}
              onChange={(url) => {
                setCfg("image_url", url);
                onSettingsChange("homepage_banner_url", url);
              }}
              folder="banners"
            />
          </Field>
          <Field label="Banner link (optional)">
            <Input
              value={cfg("link", "") || settings.homepage_banner_link}
              onChange={(e) => {
                setCfg("link", e.target.value);
                onSettingsChange("homepage_banner_link", e.target.value);
              }}
              placeholder="/shop or /category/gadgets-tech"
            />
          </Field>
        </>
      );

    case "categories":
      return (
        <>
          <Field label="Heading">
            <Input value={cfg("heading", "")} onChange={(e) => setCfg("heading", e.target.value)} />
          </Field>
          <Field label="Subheading">
            <Input value={cfg("subheading", "")} onChange={(e) => setCfg("subheading", e.target.value)} />
          </Field>
        </>
      );

    case "products": {
      const source = cfg("source", "featured") as "featured" | "new_arrival" | "manual";
      return (
        <>
          <Field label="Heading">
            <Input value={cfg("heading", "")} onChange={(e) => setCfg("heading", e.target.value)} />
          </Field>
          <Field label="Subheading">
            <Input value={cfg("subheading", "")} onChange={(e) => setCfg("subheading", e.target.value)} />
          </Field>
          <Field label="Badge text (optional)">
            <Input value={cfg("badge", "")} onChange={(e) => setCfg("badge", e.target.value)} placeholder="Just In" />
          </Field>
          <Field label="Badge color">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={cfg("badge_color", "primary")}
              onChange={(e) => setCfg("badge_color", e.target.value)}
            >
              {["primary", "emerald", "amber", "rose", "sky"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Columns (desktop)">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={String(cfg("columns", 4))}
              onChange={(e) => setCfg("columns", Number(e.target.value))}
            >
              {[2, 3, 4, 5].map((c) => (
                <option key={c} value={c}>
                  {c} columns
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={source}
              onChange={(e) => setCfg("source", e.target.value)}
            >
              <option value="featured">Featured (auto)</option>
              <option value="new_arrival">New arrivals (auto)</option>
              <option value="manual">Manual pick</option>
            </select>
          </Field>
          {source === "manual" && (
            <Field label="Pick products">
              <ProductPicker
                value={cfg<string[]>("product_ids", [])}
                onChange={(ids) => setCfg("product_ids", ids)}
                max={12}
              />
            </Field>
          )}
          {source === "featured" && (
            <Field
              label="Featured product picks (shared)"
              hint="Khali rakhle products table er 'Featured' flag use hobe."
            >
              <ProductPicker
                value={settings.featured_product_ids}
                onChange={(ids) => onSettingsChange("featured_product_ids", ids)}
                max={12}
              />
            </Field>
          )}
          {source === "new_arrival" && (
            <Field
              label="New arrival picks (shared)"
              hint="Khali rakhle products table er 'New arrival' flag use hobe."
            >
              <ProductPicker
                value={settings.new_arrival_product_ids}
                onChange={(ids) => onSettingsChange("new_arrival_product_ids", ids)}
                max={12}
              />
            </Field>
          )}
        </>
      );
    }

    case "reels":
      return (
        <Field label="Reels (max 10)">
          <ReelsManager
            value={settings.reels}
            onChange={(reels) => onSettingsChange("reels", reels)}
            max={10}
          />
        </Field>
      );

    case "rich_text":
      return (
        <>
          <Field label="Heading">
            <Input value={cfg("heading", "")} onChange={(e) => setCfg("heading", e.target.value)} />
          </Field>
          <Field label="Body">
            <Textarea rows={4} value={cfg("body", "")} onChange={(e) => setCfg("body", e.target.value)} />
          </Field>
          <Field label="Alignment">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={cfg("align", "center")}
              onChange={(e) => setCfg("align", e.target.value)}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Background">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={cfg("background", "muted")}
              onChange={(e) => setCfg("background", e.target.value)}
            >
              <option value="none">None</option>
              <option value="muted">Muted</option>
              <option value="primary">Primary tint</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA label">
              <Input value={cfg("cta_label", "")} onChange={(e) => setCfg("cta_label", e.target.value)} />
            </Field>
            <Field label="CTA link">
              <Input value={cfg("cta_link", "")} onChange={(e) => setCfg("cta_link", e.target.value)} />
            </Field>
          </div>
        </>
      );

    case "image_with_text":
      return (
        <>
          <Field label="Image">
            <ImageUploader
              value={cfg("image_url", "")}
              onChange={(url) => setCfg("image_url", url)}
              folder="cms"
            />
          </Field>
          <Field label="Image position">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={cfg("image_position", "left")}
              onChange={(e) => setCfg("image_position", e.target.value)}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Heading">
            <Input value={cfg("heading", "")} onChange={(e) => setCfg("heading", e.target.value)} />
          </Field>
          <Field label="Body">
            <Textarea rows={4} value={cfg("body", "")} onChange={(e) => setCfg("body", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA label">
              <Input value={cfg("cta_label", "")} onChange={(e) => setCfg("cta_label", e.target.value)} />
            </Field>
            <Field label="CTA link">
              <Input value={cfg("cta_link", "")} onChange={(e) => setCfg("cta_link", e.target.value)} />
            </Field>
          </div>
        </>
      );

    case "category_grid": {
      const items = cfg<Array<{ image_url: string; label: string; link: string }>>("items", []);
      return (
        <>
          <Field label="Heading">
            <Input value={cfg("heading", "")} onChange={(e) => setCfg("heading", e.target.value)} />
          </Field>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold">Tile {i + 1}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCfg("items", items.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <ImageUploader
                  value={it.image_url}
                  onChange={(url) =>
                    setCfg("items", items.map((x, j) => (j === i ? { ...x, image_url: url } : x)))
                  }
                  folder="cms"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    value={it.label}
                    placeholder="Label"
                    onChange={(e) =>
                      setCfg("items", items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                  <Input
                    value={it.link}
                    placeholder="/category/..."
                    onChange={(e) =>
                      setCfg("items", items.map((x, j) => (j === i ? { ...x, link: e.target.value } : x)))
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCfg("items", [...items, { image_url: "", label: "New tile", link: "" }])}
            >
              <Plus className="h-4 w-4" /> Add tile
            </Button>
          </div>
        </>
      );
    }

    case "testimonials":
      return (
        <>
          <Field label="Heading">
            <Input value={cfg("heading", "")} onChange={(e) => setCfg("heading", e.target.value)} />
          </Field>
          <Field label="Subheading">
            <Input value={cfg("subheading", "")} onChange={(e) => setCfg("subheading", e.target.value)} />
          </Field>
        </>
      );

    case "newsletter":
      return (
        <>
          <Field label="Heading">
            <Input value={cfg("heading", "")} onChange={(e) => setCfg("heading", e.target.value)} />
          </Field>
          <Field label="Subheading">
            <Input value={cfg("subheading", "")} onChange={(e) => setCfg("subheading", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button label">
              <Input value={cfg("button_label", "")} onChange={(e) => setCfg("button_label", e.target.value)} />
            </Field>
            <Field label="Success message">
              <Input value={cfg("success_message", "")} onChange={(e) => setCfg("success_message", e.target.value)} />
            </Field>
          </div>
        </>
      );

    case "countdown":
      return (
        <>
          <Field label="Heading">
            <Input value={cfg("heading", "")} onChange={(e) => setCfg("heading", e.target.value)} />
          </Field>
          <Field label="Subheading">
            <Input value={cfg("subheading", "")} onChange={(e) => setCfg("subheading", e.target.value)} />
          </Field>
          <Field label="Ends at" hint="ISO date — e.g. 2026-04-25T18:00:00Z">
            <Input
              type="datetime-local"
              value={toLocalInput(cfg("target_iso", ""))}
              onChange={(e) => setCfg("target_iso", new Date(e.target.value).toISOString())}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA label">
              <Input value={cfg("cta_label", "")} onChange={(e) => setCfg("cta_label", e.target.value)} />
            </Field>
            <Field label="CTA link">
              <Input value={cfg("cta_link", "")} onChange={(e) => setCfg("cta_link", e.target.value)} />
            </Field>
          </div>
        </>
      );

    case "spacer":
      return (
        <Field label="Size">
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={cfg("size", "md")}
            onChange={(e) => setCfg("size", e.target.value)}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </Field>
      );

    case "trust_badges":
    case "track_order":
      return (
        <p className="text-sm text-muted-foreground">
          This section has no settings — just toggle enable/disable above.
        </p>
      );

    default:
      return null;
  }
}

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Re-export hook so admin page can read live settings
export { useSiteSettings };
