import { createFileRoute } from "@tanstack/react-router";
import ComingSoon from "@/components/admin/ComingSoon";

export const Route = createFileRoute("/admin/orders-pipeline")({
  component: () => <ComingSoon title="Orders Pipeline" />,
});
