import Image from "next/image";
import { marketUrl } from "@/features/markets/config";
import { productLogo } from "@/features/markets/brand";
import { personalLoginUrl } from "./login-routes";
import "./domestic-entry.css";

export function DomesticEntry({ destination }: { destination?: string }) {
  return <section className="domestic-entry auth-form" aria-labelledby="edition-title">
    <div className="brand"><Image src={productLogo("cn")} alt="" width={28} height={36} unoptimized /><strong>百智</strong></div>
    <h1 id="edition-title">选择登录版本</h1>
    <p>选择你使用的百智工作台</p>
    <nav className="domestic-entry-cards" aria-label="登录版本">
      <a href={personalLoginUrl(destination)} aria-label="个人/团队版">
        <span className="entry-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/></svg></span>
        <span><strong>个人/团队版</strong><small>记录个人灵感，与团队轻松协作</small></span><span className="entry-arrow" aria-hidden="true">↗</span>
      </a>
      <a href={marketUrl("cn", "enterprise/login/")} aria-label="企业版">
        <span className="entry-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h2m2 0h2M9 11h2m2 0h2M10 21v-5h4v5"/></svg></span>
        <span><strong>企业版</strong><small>使用企业代码，进入企业专属工作台</small></span><span className="entry-arrow" aria-hidden="true">↗</span>
      </a>
    </nav>
  </section>;
}
