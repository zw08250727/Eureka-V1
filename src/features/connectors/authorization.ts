import { marketSessionStorage } from "@/features/markets/storage";
import { connectorLogin } from "./catalog";

/** Public app IDs and pre-registered redirect URIs only; secrets and token exchange belong on a server. */
export function connectorAuthorizationTarget(id: string) {
  const settings: Record<string, { endpoint: string; clientId?: string; redirect?: string; extra?: Record<string, string> }> = {
    feishu: { endpoint: "https://accounts.feishu.cn/open-apis/authen/v1/authorize", clientId: process.env.NEXT_PUBLIC_FEISHU_CLIENT_ID, redirect: process.env.NEXT_PUBLIC_FEISHU_REDIRECT_URI, extra: { response_type: "code" } },
    dingtalk: { endpoint: "https://login.dingtalk.com/oauth2/auth", clientId: process.env.NEXT_PUBLIC_DINGTALK_CLIENT_ID, redirect: process.env.NEXT_PUBLIC_DINGTALK_REDIRECT_URI, extra: { response_type: "code", prompt: "consent", scope: "openid" } },
    "tencent-meeting": { endpoint: "https://meeting.tencent.com/marketplace/authorize.html", clientId: process.env.NEXT_PUBLIC_TENCENT_MEETING_SDK_ID, redirect: process.env.NEXT_PUBLIC_TENCENT_MEETING_REDIRECT_URI, extra: { corp_id: process.env.NEXT_PUBLIC_TENCENT_MEETING_CORP_ID || "" } },
  };
  const setting = settings[id];
  if (!setting?.clientId || !setting.redirect || (id === "tencent-meeting" && !setting.extra?.corp_id))
    return { url: connectorLogin[id] || "", authorization: false };
  let callback: URL;
  try { callback = new URL(setting.redirect); } catch { return { url: connectorLogin[id] || "", authorization: false }; }
  if (callback.protocol !== "https:" && callback.hostname !== "localhost" && callback.hostname !== "127.0.0.1")
    return { url: connectorLogin[id] || "", authorization: false };
  const state = crypto.randomUUID().replaceAll("-", "");
  const target = new URL(setting.endpoint);
  target.searchParams.set(id === "tencent-meeting" ? "sdk_id" : "client_id", setting.clientId);
  target.searchParams.set("redirect_uri", setting.redirect);
  target.searchParams.set("state", state);
  for (const [key, value] of Object.entries(setting.extra || {})) target.searchParams.set(key, value);
  marketSessionStorage.setItem(`connectors:oauth-state:${id}`, state);
  return { url: target.href, authorization: true };
}
