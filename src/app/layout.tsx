import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EurekaMind · 个人 AI 工作台",
  description: "EurekaMind 个人 AI 工作台交互原型",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
