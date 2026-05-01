import { createFileRoute } from "@tanstack/react-router";
import { runPathaoStatusSync } from "@/lib/pathao.functions";

export const Route = createFileRoute("/api/public/hooks/sync-pathao-status")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await runPathaoStatusSync();
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
