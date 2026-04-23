import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  BookOpen,
  Receipt,
  Ship,
  Warehouse,
  BarChart3,
  Users,
  ShieldCheck,
  Plug,
  FileBarChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/erp/")({
  component: ErpHome,
});

const tiles = [
  { title: "Finance", desc: "Cash accounts, transactions, settlements", url: "/admin/finance", icon: Wallet },
  { title: "Accounting", desc: "Chart of accounts, general ledger", url: "/admin/accounting", icon: BookOpen },
  { title: "Expenses", desc: "Track and categorize expenses", url: "/admin/expenses", icon: Receipt },
  { title: "Profit & Loss", desc: "P&L reports by period", url: "/admin/reports/profit-loss", icon: FileBarChart },
  { title: "China Sourcing", desc: "Shipments, landed cost, suppliers", url: "/admin/china-sourcing", icon: Ship },
  { title: "Inventory", desc: "Stock levels and movements", url: "/admin/inventory", icon: Warehouse },
  { title: "Analytics", desc: "Sales analytics and ad attribution", url: "/admin/analytics", icon: BarChart3 },
  { title: "Customers", desc: "Customer profiles and segments", url: "/admin/customers", icon: Users },
  { title: "Staff", desc: "Team members and roles", url: "/admin/staff", icon: Users },
  { title: "Security", desc: "RLS audit and access control", url: "/admin/security", icon: ShieldCheck },
  { title: "Integrations", desc: "Pathao, Steadfast, Meta, etc.", url: "/admin/settings/integrations", icon: Plug },
];

function ErpHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enterprise ERP</h1>
        <p className="text-sm text-muted-foreground">
          Finance, sourcing, intelligence — all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.title} to={t.url} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{t.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
