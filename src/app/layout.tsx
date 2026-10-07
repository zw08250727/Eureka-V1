import type { Metadata } from "next";
import "./globals.css";

const title = "EurekaMind · 个人与团队 AI 工作台";
const description = "连接个人灵感与团队协作的 AI 工作台，支持会议记录、知识整理与智能助手。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "EurekaMind",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
