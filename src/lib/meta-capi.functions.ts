import { createServerFn } from "@tanstack/react-start";

/**
 * Meta Conversions API (CAPI) server-side event sender.
 *
 * Runs server-side because the CAPI access token must NEVER be exposed to
 * the browser. We hash PII (phone/email) with SHA-256 as Meta requires.
 * Fail-soft: any error is logged and returned as { ok: false }; callers
 * MUST not block order placement on this.
 *
 * Env (Lovable Cloud secrets):
 *   META_PIXEL_ID         (required) — same pixel id used by the browser snippet
 *   META_CAPI_TOKEN       (required) — Events Manager → Settings → CAPI → Access Token
 *   META_TEST_EVENT_CODE  (optional) — only set while validating in Test Events
 */

type CapiUserData = {
  phone?: string | null;
  email?: string | null;
  fbclid?: string | null;
  fbp?: string | null;
  client_ip?: string | null;
  client_user_agent?: string | null;
};

type CapiCustomData = {
  value?: number;
  currency?: string;
  order_id?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
};

type SendInput = {
  eventName: "Purchase" | "InitiateCheckout" | "AddToCart" | "ViewContent" | "Lead";
  eventId: string;
  eventSourceUrl?: string | null;
  userData: CapiUserData;
  customData?: CapiCustomData;
};

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;
  // BD: 01XXXXXXXXX or 8801XXXXXXXXX → 8801XXXXXXXXX (E.164, no +)
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "880" + digits.slice(1);
  if (digits.length === 10) return "880" + digits;
  return digits;
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const sendMetaCapiEvent = createServerFn({ method: "POST" })
  .inputValidator((input: SendInput) => {
    if (!input?.eventName || !input?.eventId) {
      throw new Error("eventName and eventId are required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const pixelId = process.env.META_PIXEL_ID || "2024086381823502";
    const token = process.env.META_CAPI_TOKEN;
    const testEventCode = process.env.META_TEST_EVENT_CODE;

    if (!token) {
      // Not configured yet — silently no-op so order placement keeps working.
      return { ok: false as const, skipped: true, reason: "META_CAPI_TOKEN not set" };
    }

    try {
      const { phone, email, fbclid, fbp, client_ip, client_user_agent } = data.userData;

      const user_data: Record<string, unknown> = {};
      const phNorm = normalizePhone(phone);
      if (phNorm) user_data.ph = [await sha256(phNorm)];
      if (email) user_data.em = [await sha256(email.toLowerCase().trim())];
      if (fbclid) user_data.fbc = `fb.1.${Date.now()}.${fbclid}`;
      if (fbp) user_data.fbp = fbp;
      if (client_ip) user_data.client_ip_address = client_ip;
      if (client_user_agent) user_data.client_user_agent = client_user_agent;

      const payload: Record<string, unknown> = {
        data: [
          {
            event_name: data.eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: data.eventId,
            event_source_url: data.eventSourceUrl ?? undefined,
            action_source: "website",
            user_data,
            custom_data: {
              currency: data.customData?.currency ?? "BDT",
              ...(data.customData?.value !== undefined && { value: data.customData.value }),
              ...(data.customData?.order_id && { order_id: data.customData.order_id }),
              ...(data.customData?.content_ids && {
                content_ids: data.customData.content_ids,
                content_type: data.customData.content_type ?? "product",
              }),
              ...(data.customData?.num_items !== undefined && {
                num_items: data.customData.num_items,
              }),
            },
          },
        ],
      };
      if (testEventCode) payload.test_event_code = testEventCode;

      const res = await fetch(
        `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn("[Meta CAPI] non-200:", res.status, body);
        return { ok: false as const, status: res.status, body };
      }
      return { ok: true as const };
    } catch (e) {
      console.warn("[Meta CAPI] send failed:", e);
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });
