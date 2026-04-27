import { createFileRoute } from "@tanstack/react-router";
import ComingSoon from "@/components/admin/ComingSoon";

export const Route = createFileRoute("/admin/inventory")({
  component: () => <ComingSoon title="Inventory" />,
});
