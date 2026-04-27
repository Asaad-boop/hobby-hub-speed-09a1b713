import { createFileRoute } from "@tanstack/react-router";
import ComingSoon from "@/components/admin/ComingSoon";

export const Route = createFileRoute("/admin/web-orders")({
  component: () => <ComingSoon title="Web Orders" />,
});
