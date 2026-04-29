import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/products")({ component: () => <Stub title="Products" /> });

function Stub({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Coming soon — this module is on the roadmap.</p>
      </Card>
    </div>
  );
}
