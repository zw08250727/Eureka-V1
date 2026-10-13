"use client";
import { DomesticAuth } from "./domestic-auth";
import { marketUrl } from "@/features/markets/config";
import { personalDestination } from "./login-routes";
import "./auth.css";

export function PersonalLogin() {
  return <div className="personal-login-page">
    <a className="login-home-link" href={marketUrl("cn")}>← 返回首页</a>
    <DomesticAuth onSuccess={() => location.replace(personalDestination(new URLSearchParams(location.search).get("next")))} />
  </div>;
}
