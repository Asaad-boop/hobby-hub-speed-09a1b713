// Pathao credentials helper — stored in localStorage (per-user device).
// Settings page er madhome user fill korbe.

export type PathaoCreds = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
  senderName: string;
  senderPhone: string;
  recipientCityId: string;
  recipientZoneId: string;
  environment: "sandbox" | "production";
};

const KEY = "brand_oms_pathao_creds_v1";

const DEFAULTS: PathaoCreds = {
  baseUrl: "https://courier-api-sandbox.pathao.com",
  clientId: "",
  clientSecret: "",
  username: "",
  password: "",
  storeId: "",
  senderName: "",
  senderPhone: "",
  recipientCityId: "1", // Dhaka
  recipientZoneId: "298", // Mirpur (sandbox default — user override korbe)
  environment: "sandbox",
};

export function loadPathaoCreds(): PathaoCreds {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PathaoCreds>) };
  } catch {
    return DEFAULTS;
  }
}

export function savePathaoCreds(creds: PathaoCreds) {
  if (typeof window === "undefined") return;
  // Auto-set baseUrl from environment
  const baseUrl =
    creds.environment === "production"
      ? "https://api-hermes.pathao.com"
      : "https://courier-api-sandbox.pathao.com";
  window.localStorage.setItem(KEY, JSON.stringify({ ...creds, baseUrl }));
}

export function isPathaoConfigured(c: PathaoCreds): boolean {
  return !!(c.clientId && c.clientSecret && c.username && c.password && c.storeId);
}
