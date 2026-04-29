// Pathao courier settings — persisted in localStorage (client-side).
// These get sent to the server function which proxies the actual Pathao API
// (avoids browser CORS + keeps the request body clean).

export type PathaoSettings = {
  baseUrl: string;       // https://api-hermes.pathao.com  OR  https://courier-api-sandbox.pathao.com
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;       // numeric store id from Pathao merchant panel
  // Default sender info (city/zone/area IDs from Pathao geo APIs)
  senderName: string;
  senderPhone: string;
  recipientCityId: string;   // default city id (e.g. "1" Dhaka)
  recipientZoneId: string;   // default zone id
};

const KEY = "brandoms.pathao.settings.v1";

export const DEFAULT_PATHAO_SETTINGS: PathaoSettings = {
  baseUrl: "https://courier-api-sandbox.pathao.com",
  clientId: "",
  clientSecret: "",
  username: "",
  password: "",
  storeId: "",
  senderName: "Florencia",
  senderPhone: "01700000000",
  recipientCityId: "1",
  recipientZoneId: "1",
};

export function loadPathaoSettings(): PathaoSettings {
  if (typeof window === "undefined") return DEFAULT_PATHAO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PATHAO_SETTINGS;
    return { ...DEFAULT_PATHAO_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PATHAO_SETTINGS;
  }
}

export function savePathaoSettings(s: PathaoSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function isPathaoConfigured(s: PathaoSettings): boolean {
  return Boolean(s.clientId && s.clientSecret && s.username && s.password && s.storeId);
}
