import type { Metadata } from "next";
import "./globals.css";

const title = "EurekaMind · 个人与团队 AI 工作台";
const description = "各人与团队 AI 工作台 产品交互原型";

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
