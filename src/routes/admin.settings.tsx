import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { getLatestGithubCommit } from "@/lib/vercel-deploy.functions";

type CommitStatus = Awaited<ReturnType<typeof getLatestGithubCommit>>;
import {
  DEFAULT_SETTINGS,
  saveSiteSettings,
  useSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { data, isLoading } = useSiteSettings();
  const queryClient = useQueryClient();
  const checkCommit = useServerFn(getLatestGithubCommit);
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<CommitStatus | null>(null);

  const onCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await checkCommit();
      setStatus(res);
      if (!res.success) toast.error(res.error);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void onCheckStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      toast.success("Settings saved — storefront e reflect hoye geche.");
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
          <h1 className="text-2xl font-bold">Site settings</h1>
          <p className="text-sm text-muted-foreground">
            Branding, contact info, social links ar hero content control koro.
          </p>
        </div>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>

      {/* Branding */}
      <Section title="Branding" description="Site naam ar logo.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Site title">
            <Input value={form.site_title} onChange={(e) => set("site_title", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <Input value={form.site_tagline} onChange={(e) => set("site_tagline", e.target.value)} />
          </Field>
        </div>
        <Field label="Logo">
          <ImageUploader
            value={form.logo_url}
            onChange={(url) => set("logo_url", url)}
            folder="branding"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Khali rakhle default logo use hobe.
          </p>
        </Field>
      </Section>

      {/* Contact */}
      <Section title="Contact" description="Phone, email ar address — footer e show hobe.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Phone">
            <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
            />
          </Field>
          <Field label="WhatsApp number (with country code, digits only)">
            <Input
              value={form.whatsapp_number}
              onChange={(e) => set("whatsapp_number", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="8801964437520"
            />
          </Field>
          <Field label="Free delivery threshold (৳)">
            <Input
              type="number"
              min={0}
              value={form.free_delivery_threshold}
              onChange={(e) => set("free_delivery_threshold", Number(e.target.value) || 0)}
            />
          </Field>
        </div>
        <Field label="WhatsApp default message">
          <Input
            value={form.whatsapp_message}
            onChange={(e) => set("whatsapp_message", e.target.value)}
          />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </Section>

      {/* Social */}
      <Section title="Social links" description="Footer er social icons.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Facebook URL">
            <Input
              value={form.social_facebook}
              onChange={(e) => set("social_facebook", e.target.value)}
            />
          </Field>
          <Field label="Instagram URL">
            <Input
              value={form.social_instagram}
              onChange={(e) => set("social_instagram", e.target.value)}
            />
          </Field>
          <Field label="YouTube URL">
            <Input
              value={form.social_youtube}
              onChange={(e) => set("social_youtube", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Hero */}
      <Section title="Homepage hero" description="Top hero section er text content.">
        <Field label="Badge text">
          <Input value={form.hero_badge} onChange={(e) => set("hero_badge", e.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Heading (line 1)">
            <Input
              value={form.hero_heading}
              onChange={(e) => set("hero_heading", e.target.value)}
            />
          </Field>
          <Field label="Heading highlight (line 2)">
            <Input
              value={form.hero_heading_highlight}
              onChange={(e) => set("hero_heading_highlight", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Subheading">
          <Textarea
            rows={3}
            value={form.hero_subheading}
            onChange={(e) => set("hero_subheading", e.target.value)}
          />
        </Field>
      </Section>

      {/* Deployment */}
      <Section
        title="Deployment"
        description="GitHub e push korar 1-2 min er moddhe Vercel auto-deploy hoye live hoy. Latest commit ar Vercel dashboard ekhane."
      >
        <DeployStatusPanel
          status={status}
          checking={checking}
          onRefresh={onCheckStatus}
        />
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button asChild variant="default">
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Open Vercel dashboard
            </a>
          </Button>
          <Button
            onClick={onCheckStatus}
            disabled={checking}
            variant="outline"
            size="sm"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-check commit
          </Button>
        </div>
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
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
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

function DeployStatusPanel({
  status,
  checking,
  onRefresh,
}: {
  status: CommitStatus | null;
  checking: boolean;
  onRefresh: () => void;
}) {
  if (!status) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        {checking ? "Loading latest commit…" : "No status yet."}
      </div>
    );
  }
  if (!status.success) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Cannot read commit</p>
            <p className="text-muted-foreground">{status.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Latest GitHub commit (main)</span>
        <button
          onClick={onRefresh}
          disabled={checking}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {checking ? "Checking…" : "Refresh"}
        </button>
      </div>

      <div className="rounded-md border border-border bg-background p-3 space-y-1">
        <a
          href={status.commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-primary hover:underline"
        >
          {status.shortSha}
        </a>
        <p className="truncate text-sm">{status.commitMessage}</p>
        <p className="text-xs text-muted-foreground">
          Committed: {new Date(status.committedAt).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground pt-1">
          Vercel auto-deploys ei commit ti production e — push er por 1-2 min wait koren.
        </p>
      </div>
    </div>
  );
}
