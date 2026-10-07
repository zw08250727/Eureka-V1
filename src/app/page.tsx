import type { Metadata } from "next";
import { Auth } from "@/features/auth/auth";
export const metadata: Metadata = {
  title: "EurekaMind · 个人与团队工作空间",
  description: "个人与团队 AI 工作台 产品交互原型",
};
export default function HomePage() {
  return <Auth />;
}
