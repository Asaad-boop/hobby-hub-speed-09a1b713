import { createFileRoute } from "@tanstack/react-router";
import ComingSoon from "@/components/admin/ComingSoon";

export const Route = createFileRoute("/admin/")({
  component: () => <ComingSoon title="Dashboard" />,
});
