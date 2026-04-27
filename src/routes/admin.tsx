import { createFileRoute } from "@tanstack/react-router";
import AdminShell from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — HobbyShop" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminShell,
});
