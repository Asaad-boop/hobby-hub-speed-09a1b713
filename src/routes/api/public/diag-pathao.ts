import { createFileRoute } from "@tanstack/react-router";

const PATHAO_BASE_URL = "https://api-hermes.pathao.com";

async function withTimeout(p: Promise<Response>, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p;
  } finally {
    clearTimeout(t);
  }
}

export const Route = createFileRoute("/api/public/diag-pathao")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const key = url.searchParams.get("key");
        if (key !== "diag-2026") {
          return new Response("forbidden", { status: 403 });
        }

        const out: Record<string, unknown> = {};
        const env = {
          PATHAO_CLIENT_ID: !!process.env.PATHAO_CLIENT_ID,
          PATHAO_CLIENT_SECRET: !!process.env.PATHAO_CLIENT_SECRET,
          PATHAO_USERNAME: !!process.env.PATHAO_USERNAME,
          PATHAO_PASSWORD: !!process.env.PATHAO_PASSWORD,
          PATHAO_STORE_ID: process.env.PATHAO_STORE_ID ?? null,
        };
        out.env = env;

        try {
          // 1) Auth
          const authRes = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/issue-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              client_id: process.env.PATHAO_CLIENT_ID,
              client_secret: process.env.PATHAO_CLIENT_SECRET,
              username: process.env.PATHAO_USERNAME,
              password: process.env.PATHAO_PASSWORD,
              grant_type: "password",
            }),
          });
          const authJson = await authRes.json().catch(() => ({}));
          out.auth = { status: authRes.status, ok: authRes.ok, body: authJson };
          const token = (authJson as { access_token?: string }).access_token;
          if (!token) {
            return new Response(JSON.stringify(out, null, 2), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 2) Stores
          const storesRes = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/stores`, {
            method: "GET",
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          });
          out.stores = {
            status: storesRes.status,
            body: await storesRes.json().catch(() => ({})),
          };

          // 3) City list
          const citiesRes = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/city-list`, {
            method: "GET",
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          });
          const citiesJson = (await citiesRes.json().catch(() => ({}))) as {
            data?: { data?: Array<{ city_id: number; city_name: string }> };
          };
          out.cities = {
            status: citiesRes.status,
            count: citiesJson.data?.data?.length ?? 0,
            sample: citiesJson.data?.data?.slice(0, 5),
          };

          // 4) Try price-plan with a real Dhaka order (dry-run)
          const dhaka = citiesJson.data?.data?.find((c) =>
            c.city_name.toLowerCase().includes("dhaka"),
          );
          if (dhaka) {
            const zonesRes = await fetch(
              `${PATHAO_BASE_URL}/aladdin/api/v1/cities/${dhaka.city_id}/zone-list`,
              {
                method: "GET",
                headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
              },
            );
            const zonesJson = (await zonesRes.json().catch(() => ({}))) as {
              data?: { data?: Array<{ zone_id: number; zone_name: string }> };
            };
            const zones = zonesJson.data?.data ?? [];
            out.dhakaZones = {
              status: zonesRes.status,
              count: zones.length,
              sample: zones.slice(0, 5),
            };

            // 5) Test create order (will actually create — only run if requested)
            if (url.searchParams.get("createTest") === "1" && zones[0]) {
              const storeId = process.env.PATHAO_STORE_ID;
              const payload = {
                store_id: Number(storeId),
                merchant_order_id: `DIAG_${Date.now()}`,
                recipient_name: "Diagnostic Test",
                recipient_phone: "01712345678",
                recipient_address: "Test address, Dhaka",
                recipient_city: dhaka.city_id,
                recipient_zone: zones[0].zone_id,
                delivery_type: 48,
                item_type: 2,
                special_instruction: "DIAGNOSTIC - DO NOT SHIP",
                item_quantity: 1,
                item_weight: 0.5,
                amount_to_collect: 0,
                item_description: "diagnostic test",
              };
              const orderRes = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/orders`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              });
              out.testOrder = {
                status: orderRes.status,
                payload,
                body: await orderRes.json().catch(() => ({})),
              };
            }
          }
        } catch (e) {
          out.error = String(e);
        }

        return new Response(JSON.stringify(out, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
