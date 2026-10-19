import { createLocalServer, readConfig } from "./service.ts";
const port = Number(process.env.AIRWALLEX_PORT || 3101);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error("AIRWALLEX_PORT 必须为 1024–65535");
const server = createLocalServer(readConfig());
server.on("error", (error: NodeJS.ErrnoException) => { console.error(`Airwallex 本地服务启动失败：${error.code || "unknown"}`); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`Airwallex sandbox API: http://127.0.0.1:${port} (GET /health)`));
