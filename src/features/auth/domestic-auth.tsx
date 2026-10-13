"use client";
import Image from "next/image";
import { productLogo } from "@/features/markets/brand";
import { DomesticCredentials } from "./domestic-credentials";
import "./domestic-auth.css";

export function DomesticAuth({ onSuccess }: { onSuccess?: () => void }) {
  return <main className="auth auth-centered domestic-auth">
    <section className="auth-form">
      <div className="brand"><Image className="baizhi-mark" src={productLogo("cn")} alt="" width={32} height={40} unoptimized /><strong>百智</strong></div>
      <h1>欢迎登录</h1>
      <p className="desc">欢迎来到百智，新用户将自动注册</p>
      <DomesticCredentials onSuccess={onSuccess} />
    </section>
  </main>;
}
