import { MarketWorkbench } from "@/features/markets/workbench";
import "@/features/reference/prototype.css";
import "@/app/workbench/toast.css";
export default function Home() {
  return <MarketWorkbench market="global" />;
}
