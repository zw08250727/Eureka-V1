import "@/features/markets/baizhi-theme.css";
import "@/features/account/domestic-ui.css";
import type { ReactNode } from "react";
export const metadata = { title: "百智 · 个人与团队 AI 工作台", description: "记录会议、捕捉灵感，与团队协作。" };
export default function MarketLayout({ children }: { children: ReactNode }) {
  return (
    <div className="market-surface" data-market="cn">
      {children}
    </div>
  );
}
