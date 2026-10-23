import { createAirwallexServer, readConfig } from "./service.ts";
const port = Number(process.env.PORT || process.env.AIRWALLEX_PORT || 3101);
const host = process.env.AIRWALLEX_HOST || (process.env.RENDER_EXTERNAL_HOSTNAME ? "0.0.0.0" : "127.0.0.1");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error("PORT / AIRWALLEX_PORT 必须为 1–65535");
const server = createAirwallexServer(readConfig());
server.on("error", (error: NodeJS.ErrnoException) => { console.error(`Airwallex 服务启动失败：${error.code || "unknown"}`); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Airwallex sandbox API listening on ${host}:${port} (GET /health)`));
