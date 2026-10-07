import type { Metadata } from "next";
import { Auth } from "@/features/auth/auth";
export const metadata: Metadata = {
  title: "EurekaMind · 个人与团队工作空间",
  description: "一个账号，连接个人灵感与团队协作。",
};
export default function HomePage() {
  return <Auth />;
}
