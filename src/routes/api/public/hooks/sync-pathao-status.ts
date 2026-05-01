import { createFileRoute } from "@tanstack/react-router";
import { syncPathaoStatusesInternal } from "@/lib/pathao-sync.server";

export const Route = createFileRoute("/api/public/hooks/sync-pathao-status")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await syncPathaoStatusesInternal(300);
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
