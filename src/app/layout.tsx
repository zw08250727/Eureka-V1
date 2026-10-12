import type { Metadata } from "next";
import "./globals.css";
import "@/features/markets/theme.css";

const title = "百智 / EurekaMind";
const description = "记录会议、捕捉灵感，与团队协作。";

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
