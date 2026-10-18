import { routeMarket, type Market } from "./config";
const SESSION = "eureka:auth:v1";
export function scopedKey(key: string, market: Market | null = routeMarket()) {
  return market ? `eureka:market:${market}:${key}` : key;
}
/** Explicit adapter: never patches window.Storage or migrates legacy data implicitly. */
export function createMarketStorage(
  storage: Storage,
  market: Market | null,
): Storage {
  const prefix = market ? `eureka:market:${market}:` : "";
  const keys = () =>
    Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter(
      (k) => k.startsWith(prefix),
    );
  return {
    get length() {
      return keys().length;
    },
    key: (index) => keys()[index]?.slice(prefix.length) ?? null,
    getItem: (key) => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: (key) => storage.removeItem(prefix + key),
    clear: () => keys().forEach((key) => storage.removeItem(key)),
  };
}
function browserStorage(kind: "localStorage" | "sessionStorage"): Storage {
  const get = () => createMarketStorage(window[kind], routeMarket());
  return {
    get length() {
      return get().length;
    },
    key: (i) => get().key(i),
    getItem: (k) => get().getItem(k),
    setItem: (k, v) => get().setItem(k, v),
    removeItem: (k) => get().removeItem(k),
    clear: () => get().clear(),
  };
}
export const marketStorage = browserStorage("localStorage");
/** Capture the initiating market for asynchronous callbacks. No data is copied. */
export function captureMarketStorage(): Storage {
  return createMarketStorage(window.localStorage, routeMarket());
}
export const marketSessionStorage = browserStorage("sessionStorage");
export function signIn(market: Market, identity: string, provider: string) {
  createMarketStorage(window.localStorage, market).setItem(
    SESSION,
    JSON.stringify({
      market,
      realm: `eureka-${market}`,
      identity,
      provider,
      signedInAt: new Date().toISOString(),
    }),
  );
}
export function readIdentity(market: Market) {
  const raw = createMarketStorage(window.localStorage, market).getItem(SESSION);
  if (!raw) return null;
  let session;
  try { session = JSON.parse(raw); } catch { return null; }
  if (!session || typeof session !== "object") return null;
  return session.market === market &&
    session.realm === `eureka-${market}` &&
    typeof session.identity === "string"
    ? (session as { market: Market; identity: string })
    : null;
}
export function signOut() {
  const market = routeMarket();
  marketStorage.removeItem(SESSION);
  location.assign(
    `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${market ? market + "/" : ""}`,
  );
}
