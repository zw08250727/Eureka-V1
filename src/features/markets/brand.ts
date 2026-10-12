import { marketConfig, type Market } from "./config";
import { assetUrl, basePath } from "@/lib/routes";
export const productName = (market?: Market) => marketConfig(market).brand;
export const productLogo = (market?: Market) => marketConfig(market).id === "cn" ? `${basePath}/brand/baizhi-mark.svg` : assetUrl("eurekamind-logo.png");
