import { marketSessionStorage } from "@/features/markets/storage";

/** Open a paid order's official invoice while the click still has popup permission. */
export async function openAirwallexInvoice(workspaceId: string, actor: string, orderId: string) {
  const requestId = marketSessionStorage.getItem(`airwallex:${workspaceId}:${actor}:${orderId}`);
  if (!requestId) throw Error("该订单暂无可查看的 Airwallex invoice");
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw Error("请允许打开账单窗口后重试");
  popup.opener = null;
  try {
    const endpoint = (process.env.NEXT_PUBLIC_AIRWALLEX_CHECKOUT_API || "http://127.0.0.1:3101/api/airwallex/checkouts").replace(/\/checkouts\/?$/, "/invoices");
    const response = await fetch(`${endpoint}?market=global&workspaceId=${encodeURIComponent(workspaceId)}&requestId=${encodeURIComponent(requestId)}`, {
      headers: { "X-Eureka-Checkout": "1" }, signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw Error("Airwallex invoice 暂不可用，请稍后重试");
    const data = await response.json();
    const pdf = data.items?.find((item: { pdfUrl?: string }) => item.pdfUrl)?.pdfUrl;
    if (!pdf) throw Error("该订单暂无可查看的 Airwallex invoice");
    const url = new URL(pdf);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".airwallex.com") || url.username || url.password) throw Error("Airwallex invoice 地址无效");
    popup.location.replace(url.href);
  } catch (error) {
    popup.close();
    throw error;
  }
}
