import { basePath, assetUrl } from "@/lib/routes";
import { markets, type Market } from "@/features/markets/config";

export function thoughtGuide(market: Market) {
  const domestic = market === "cn";
  return {
    brand: markets[market].brand,
    download: domestic ? "https://www.100wiser.com/wisenote" : "https://eurekamind.ai/download",
    shop: domestic ? "https://www.100wiser.com/wisenote" : "https://eurekamind.ai/shop",
    qr: `${basePath}/brand/${domestic ? "wisenote" : "eurekamind"}-download-qr.svg`,
    device: domestic ? `${basePath}/brand/wisenote-device.png` : assetUrl("download/eurekamind-device.webp"),
  };
}
