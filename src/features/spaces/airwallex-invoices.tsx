"use client";
import { useEffect, useState } from "react";
import { usesAirwallexSandbox } from "./use-airwallex-checkout";
import { WsButton as Button, Badge } from "./billing-ui";

type Invoice = { id: string; number: string; date: string; amount: number | null; currency: string; status: string; paymentStatus: string; pdfUrl: string | null };
export function AirwallexInvoices({ workspaceId, revision }: { workspaceId: string; revision: number }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{ scope: string; items: Invoice[]; loading: boolean; error: string }>({ scope: "", items: [], loading: true, error: "" });
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    async function read() {
      setState({ scope: workspaceId, items: [], loading: true, error: "" });
      try {
        if (!usesAirwallexSandbox()) throw Error("INV-UNAVAILABLE");
        const endpoint = (process.env.NEXT_PUBLIC_AIRWALLEX_CHECKOUT_API || "http://127.0.0.1:3101/api/airwallex/checkouts").replace(/\/checkouts\/?$/, "/invoices");
        const response = await fetch(`${endpoint}?market=global&workspaceId=${encodeURIComponent(workspaceId)}`, { headers: { "X-Eureka-Checkout": "1" }, signal: AbortSignal.any([abort.signal, AbortSignal.timeout(45000)]) });
        if (!response.ok) throw Error(`INV-${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data.items)) throw Error("INV-RESPONSE");
        if (active) setState({ scope: workspaceId, items: data.items, loading: false, error: "" });
      } catch (error) {
        const code = error instanceof Error && /^INV-[A-Z0-9]+$/.test(error.message) ? error.message : "INV-CONNECT";
        if (active) setState({ scope: workspaceId, items: [], loading: false, error: `账单暂时无法加载，请重试（错误码：${code}）` });
      }
    }
    void read();
    return () => { active = false; abort.abort(); };
  }, [workspaceId, revision, reload]);
  const loading = state.loading || state.scope !== workspaceId;
  const status = (i: Invoice) => i.status === "VOIDED" ? "已作废" : i.status === "DRAFT" ? "草稿" : i.paymentStatus === "PAID" ? "已支付" : "待支付";
  return <section className="ws-surface">
    <div className="ws-section-head"><h2>账单历史</h2><Button disabled={loading} onClick={() => setReload(n => n + 1)}>刷新</Button></div>
    {loading ? <p role="status">正在加载账单…</p> : state.error ? <p role="alert" className="ws-form-error">{state.error}</p> : !state.items.length ? <p className="ws-muted">暂无账单记录</p> : <div className="ws-table-scroll"><table className="ws-table">
      <thead><tr>{["账单", "金额", "状态", "凭证"].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{state.items.map(i => <tr key={i.id}>
        <td>{i.number}<small>{i.date ? new Date(i.date).toLocaleDateString("zh-CN") : "—"}</small></td>
        <td>{i.amount === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: i.currency }).format(i.amount)} {i.currency}</td>
        <td><Badge kind={status(i) === "已支付" ? "green" : "amber"}>{status(i)}</Badge></td>
        <td>{i.pdfUrl ? <a className="ws-btn link" href={i.pdfUrl} target="_blank" rel="noopener noreferrer">下载 PDF</a> : "—"}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
