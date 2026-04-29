import { useMemo, useState } from "react";
import { Search, Copy, ExternalLink } from "lucide-react";
import { useOpsStore } from "@/lib/ops-store";
import { fraudBadgeClasses, fraudLabel, type Customer } from "@/lib/mock-data";
import { calculateFraudScore } from "@/lib/fraud-engine";
import { Btn, Input, MetricCard, PageHeader } from "@/components/admin/ui";

export default function CourierFraudPage() {
  const orders = useOpsStore((s) => s.orders);
  const customers = useOpsStore((s) => s.customers);

  const [phoneInput, setPhoneInput] = useState("");
  const [checked, setChecked] = useState<{ customer: Customer | null; result: ReturnType<typeof calculateFraudScore> } | null>(null);

  const runCheck = () => {
    const customer = customers.find((c) => c.phone === phoneInput.trim()) ?? null;
    const history = orders.filter((o) => o.phone === phoneInput.trim());
    const result = calculateFraudScore({ phone: phoneInput.trim() }, customer, history);
    setChecked({ customer, result });
  };

  const todayCourierCounts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const list = orders.filter((o) => new Date(o.createdAt) >= today);
    const count = (name: string) => list.filter((o) => o.courier === name).length;
    return { Pathao: count("Pathao"), Steadfast: count("Steadfast"), RedX: count("RedX"), eCourier: count("eCourier") };
  }, [orders]);

  const courierEntries = orders.filter((o) => o.trackingNumber);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Courier & Fraud" subtitle="Customer trust + courier shipments" />
      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-5 space-y-5">
        {/* Fraud Checker */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Fraud Checker</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Look up a phone number to see customer history & risk.</p>
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="01711000099" className="pl-8" />
            </div>
            <Btn variant="primary" onClick={runCheck}>Check</Btn>
          </div>

          {checked && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              {checked.customer ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-base font-semibold text-foreground">{checked.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{checked.customer.phone}</div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      <Stat label="Total" value={checked.customer.totalOrders} />
                      <Stat label="Delivered" value={checked.customer.delivered} />
                      <Stat label="Cancelled" value={checked.customer.cancelled} />
                      <Stat label="Returned" value={checked.customer.returned} />
                    </div>
                    {checked.customer.note && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <strong>Admin note:</strong> {checked.customer.note}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${fraudBadgeClasses(checked.result.score, checked.customer.isBlacklisted)}`}>
                        {fraudLabel(checked.result.score, checked.customer.isBlacklisted)}
                      </span>
                      <span className="text-xs text-muted-foreground">Score {checked.result.score}/100</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full ${
                          checked.result.score >= 70 ? "bg-rose-500" : checked.result.score >= 30 ? "bg-amber-500" : "bg-[#1D9E75]"
                        }`}
                        style={{ width: `${checked.result.score}%` }}
                      />
                    </div>
                    <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reasons</div>
                    <ul className="mt-1 space-y-1 text-sm">
                      {checked.result.reasons.length === 0
                        ? <li className="text-muted-foreground">No risk signals.</li>
                        : checked.result.reasons.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-muted-foreground">•</span>{r}</li>)}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No customer record found for <strong className="text-foreground">{phoneInput}</strong>. Treating as first-ever order.</div>
              )}
            </div>
          )}
        </div>

        {/* Courier Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Pathao Today" value={todayCourierCounts.Pathao} accent />
          <MetricCard label="Steadfast Today" value={todayCourierCounts.Steadfast} />
          <MetricCard label="RedX Today" value={todayCourierCounts.RedX} />
          <MetricCard label="eCourier Today" value={todayCourierCounts.eCourier} />
        </div>

        {/* Courier Entries */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">Courier Entries</h3>
            <p className="text-xs text-muted-foreground">{courierEntries.length} shipments with tracking</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left">Order ID</th>
                  <th className="px-4 py-2.5 text-left">Tracking #</th>
                  <th className="px-4 py-2.5 text-left">Courier</th>
                  <th className="px-4 py-2.5 text-left">Customer</th>
                  <th className="px-4 py-2.5 text-left">Area</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courierEntries.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs">{o.id}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{o.trackingNumber}</td>
                    <td className="px-4 py-2.5">{o.courier}</td>
                    <td className="px-4 py-2.5">{o.customerName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.district}</td>
                    <td className="px-4 py-2.5">{o.status}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <Btn size="sm"><ExternalLink className="h-3.5 w-3.5" />Track</Btn>
                        <Btn size="sm" onClick={() => navigator.clipboard?.writeText(o.trackingNumber!)}>
                          <Copy className="h-3.5 w-3.5" />Copy
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
                {courierEntries.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No courier entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-2 py-2">
      <div className="text-base font-semibold text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
