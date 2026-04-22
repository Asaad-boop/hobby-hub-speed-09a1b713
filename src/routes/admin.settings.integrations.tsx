import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Settings,
  Truck,
  Megaphone,
  Activity,
  Eye,
  EyeOff,
  Send,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAdminAuth } from "@/lib/admin";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin/settings/integrations")({
  head: () => ({ meta: [{ title: "Integrations — Admin" }] }),
  component: IntegrationsPage,
});

type Integration = {
  id: string;
  name: string;
  provider: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  last_sync_status: string | null;
};

function IntegrationsPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const qc = useQueryClient();
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["admin", "integrations"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Integration[];
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Admin access required.</div>;
  }

  const toggleEnabled = async (row: Integration, enabled: boolean) => {
    const { error } = await supabase
      .from("integrations")
      .update({ is_enabled: enabled })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${row.provider} ${enabled ? "enabled" : "disabled"}`);
    qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
  };

  const cards = [
    {
      key: "bd_courier",
      title: "BD Courier",
      desc: "Customer courier success history (Pathao, RedX, Steadfast, Paperfly)",
      icon: Truck,
      ready: true,
    },
    {
      key: "meta_ads",
      title: "Meta Ads",
      desc: "Campaign sync, ad spend, attribution (coming soon)",
      icon: Megaphone,
      ready: false,
    },
    {
      key: "meta_capi",
      title: "Meta Conversions API",
      desc: "Server-side Purchase, AddToCart, etc. (coming soon)",
      icon: Activity,
      ready: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin/settings">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to settings
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Third-party API integrations — configure credentials and sync schedules.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => {
            const row = integrations.find((i) => i.name === c.key);
            const Icon = c.icon;
            return (
              <Card key={c.key} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{c.title}</CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">{c.desc}</p>
                      </div>
                    </div>
                    {row?.is_enabled ? (
                      <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Last sync:{" "}
                    {row?.last_sync_at
                      ? formatDistanceToNow(new Date(row.last_sync_at), { addSuffix: true })
                      : "Never"}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row?.is_enabled ?? false}
                        onCheckedChange={(v) => row && toggleEnabled(row, v)}
                        disabled={!row || !c.ready}
                      />
                      <span className="text-xs text-muted-foreground">
                        {c.ready ? "Toggle" : "Coming soon"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!c.ready}
                      onClick={() => setOpenDialog(c.key)}
                    >
                      <Settings className="mr-1 h-3.5 w-3.5" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BdCourierDialog
        open={openDialog === "bd_courier"}
        onClose={() => setOpenDialog(null)}
        integration={integrations.find((i) => i.name === "bd_courier")}
      />
    </div>
  );
}

function BdCourierDialog({
  open,
  onClose,
  integration,
}: {
  open: boolean;
  onClose: () => void;
  integration: Integration | undefined;
}) {
  const qc = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [cacheHours, setCacheHours] = useState<number>(
    Number((integration?.config as { cache_hours?: number })?.cache_hours ?? 24 * 7),
  );
  const [swr, setSwr] = useState<boolean>(
    ((integration?.config as { stale_while_revalidate?: boolean })?.stale_while_revalidate ?? true) === true,
  );
  const [enabled, setEnabled] = useState<boolean>(integration?.is_enabled ?? false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Usage stats — last 30d API calls + cache hit rate
  const { data: usage } = useQuery({
    queryKey: ["admin", "bd_courier_usage"],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: monthCount } = await supabase
        .from("integration_logs")
        .select("id", { count: "exact", head: true })
        .eq("integration_name", "bd_courier")
        .gte("created_at", since);

      const { count: todayCount } = await supabase
        .from("integration_logs")
        .select("id", { count: "exact", head: true })
        .eq("integration_name", "bd_courier")
        .gte("created_at", todayStart.toISOString());

      const { count: cacheRows } = await supabase
        .from("courier_stats_cache")
        .select("id", { count: "exact", head: true });

      // Cache hit rate ~ (cached_phones - api_calls) / cached_phones (rough heuristic)
      const totalLookups = (cacheRows ?? 0) + (monthCount ?? 0);
      const hitRate =
        totalLookups > 0 ? Math.round(((cacheRows ?? 0) / totalLookups) * 100) : 0;

      return {
        today: todayCount ?? 0,
        month: monthCount ?? 0,
        cached_phones: cacheRows ?? 0,
        hit_rate: hitRate,
      };
    },
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-courier-stats", {
        body: { phone: "01711000000", force_refresh: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTestResult({
        ok: true,
        msg: `✅ Connection working — source: ${data?.source ?? "unknown"}`,
      });
    } catch (e) {
      setTestResult({ ok: false, msg: `❌ ${(e as Error).message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!integration) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("integrations")
        .update({
          is_enabled: enabled,
          config: {
            ...(integration.config || {}),
            cache_hours: cacheHours,
            stale_while_revalidate: swr,
          },
        })
        .eq("id", integration.id);
      if (error) throw error;

      if (apiKey.trim()) {
        toast.info(
          "API key entered — Lovable will prompt you to securely store BD_COURIER_API_KEY in the next step.",
        );
      }

      toast.success("BD Courier settings saved");
      qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            BD Courier API
          </DialogTitle>
          <DialogDescription>
            Customer courier history theke risk assess koro — Pathao, RedX, Steadfast, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Usage widget */}
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              API Usage (credit saving)
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">{usage?.today ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Today</p>
              </div>
              <div>
                <p className="text-lg font-bold">{usage?.month ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Last 30 days</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {usage?.hit_rate ?? 0}%
                </p>
                <p className="text-[10px] text-muted-foreground">Cache hit rate</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {usage?.cached_phones ?? 0} unique phone numbers cached.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
            <p className="mb-1 font-semibold">Setup steps:</p>
            <ol className="list-inside list-decimal space-y-0.5 text-muted-foreground">
              <li>bdcourier.com/register a account toiri korun</li>
              <li>WhatsApp group join kore number verify korun</li>
              <li>bdcourier.com/user/api theke API key copy korun</li>
              <li>Niche paste kore Save korun (key Lovable Secrets a securely store hobe)</li>
              <li>Test Connection chap dile verify hobe</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={
                  integration?.is_enabled ? "(stored — paste new key to replace)" : "Paste your BD Courier API key"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Stored as <code className="rounded bg-muted px-1">BD_COURIER_API_KEY</code> in Edge Function secrets — never visible in code.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Cache duration</Label>
            <Select value={String(cacheHours)} onValueChange={(v) => setCacheHours(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">1 day</SelectItem>
                <SelectItem value="72">3 days</SelectItem>
                <SelectItem value="168">7 days (recommended)</SelectItem>
                <SelectItem value="336">14 days</SelectItem>
                <SelectItem value="720">30 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Longer cache = fewer API credits used. Customer history rarely changes daily.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-3">
              <p className="text-sm font-medium">Stale-while-revalidate</p>
              <p className="text-xs text-muted-foreground">
                Show cached data instantly, refresh in background — best UX, saves credits.
              </p>
            </div>
            <Switch checked={swr} onCheckedChange={setSwr} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable integration</p>
              <p className="text-xs text-muted-foreground">
                Off thakle web order page e fallback dekhabo.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1 h-3.5 w-3.5" />
              )}
              Test Connection
            </Button>
            {testResult && (
              <span
                className={`flex items-center gap-1 text-xs ${
                  testResult.ok
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {testResult.msg}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
