import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, ExternalLink, Sparkles, Image as ImageIcon, Star, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "@/components/admin/ImageUploader";
import ProductPicker from "@/components/admin/ProductPicker";
import {
  DEFAULT_SETTINGS,
  saveSiteSettings,
  useSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings";

export const Route = createFileRoute("/admin/homepage")({
  component: AdminHomepagePage,
});

function AdminHomepagePage() {
  const { data, isLoading } = useSiteSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSiteSettings(form);
      await queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Homepage updated — storefront e reflect hoye geche.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Homepage CMS</h1>
          <p className="text-sm text-muted-foreground">
            Hero showcase, banner, ar featured/new-arrival sections control koro.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/" target="_blank">
              <ExternalLink className="h-4 w-4" /> View storefront
            </Link>
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>

      <Section
        icon={<Sparkles className="h-4 w-4 text-primary" />}
        title="Hero showcase products"
        description="Top hero rotator e ja products dekhabe. Order matter kore. Khali rakhle prothom 4 product use hobe."
      >
        <ProductPicker
          value={form.hero_product_ids}
          onChange={(ids) => set("hero_product_ids", ids)}
          max={6}
          emptyHint="Hero te products add koro (max 6)."
        />
      </Section>

      <Section
        icon={<ImageIcon className="h-4 w-4 text-primary" />}
        title="Promotional banner"
        description="Homepage e ekta promotional banner show korbe (hero ar new arrivals er majhe)."
      >
        <Field label="Banner image (optional)">
          <ImageUploader
            value={form.homepage_banner_url}
            onChange={(url) => set("homepage_banner_url", url)}
            folder="banners"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Khali rakhle banner section hide thakbe. Recommended size: 1600×400.
          </p>
        </Field>
        <Field label="Banner link (optional)">
          <Input
            value={form.homepage_banner_link}
            onChange={(e) => set("homepage_banner_link", e.target.value)}
            placeholder="/shop or /category/gadgets-tech"
          />
        </Field>
      </Section>

      <Section
        icon={<PackageOpen className="h-4 w-4 text-emerald-600" />}
        title="New arrivals (curated)"
        description="Override the default new-arrivals section. Khali rakhle products table er 'New arrival' flagged products auto-show korbe."
      >
        <ProductPicker
          value={form.new_arrival_product_ids}
          onChange={(ids) => set("new_arrival_product_ids", ids)}
          max={8}
          emptyHint="Auto mode — products page theke 'New arrival' toggle on koro."
        />
      </Section>

      <Section
        icon={<Star className="h-4 w-4 text-amber-500" />}
        title="Trending / featured (curated)"
        description="Override the trending section. Khali rakhle products table er 'Featured' flagged products auto-show korbe."
      >
        <ProductPicker
          value={form.featured_product_ids}
          onChange={(ids) => set("featured_product_ids", ids)}
          max={8}
          emptyHint="Auto mode — products page theke 'Featured' toggle on koro."
        />
      </Section>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </header>
      <Separator className="mb-4" />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
