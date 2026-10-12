import { routeMarket } from "./config";
/** Review controls are opt-in and never part of the normal market journey. */
export function reviewToolsEnabled() {
  return typeof location !== "undefined" && (!routeMarket() || new URLSearchParams(location.search).get("review") === "1");
}
