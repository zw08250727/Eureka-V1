import { spawnSync } from "node:child_process";
import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("artifacts/markets");
await mkdir(root, { recursive: true });
const run = (command, args, options = {}) => {
  const r = spawnSync(command, args, { stdio: "inherit", ...options });
  if (r.status !== 0) throw Error(`${command} failed (${r.status})`);
};
const git = (args) =>
  spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
const commit = git(["rev-parse", "HEAD"]),
  dirty = !!git(["status", "--porcelain"]);
const prd = JSON.parse(
  await readFile("src/prototype/prd/content.json", "utf8"),
);
const standards = JSON.parse(await readFile("spc/modules.json", "utf8"));
const manifests = [];
for (const market of ["cn", "global"]) {
  // Each standalone build exposes only its own links. Keep the canonical /<market>/ route.
  run("npm", ["run", "build"], {
    env: {
      ...process.env,
      NEXT_PUBLIC_BASE_PATH: "",
      NEXT_PUBLIC_RELEASE_MARKET: market,
    },
  });
  const dest = path.join(root, market);
  await rm(dest, { recursive: true, force: true }); // Only this script's generated artifact directory.
  await cp("out", dest, { recursive: true });
  await cp("spc", path.join(dest, "spc"), { recursive: true });
  await mkdir(path.join(dest, "docs"), { recursive: true });
  await cp("docs/baizhi-visual-reference.md", path.join(dest, "docs/baizhi-visual-reference.md"));
  await cp("docs/baizhi-billing-reference.md", path.join(dest, "docs/baizhi-billing-reference.md"));
  for (const name of ["baizhi-meeting-reference.md", "baizhi-meeting-export-share.md", "domestic-meeting-assets.md"]) await cp(`docs/${name}`, path.join(dest, "docs", name));
  // This dated report is evidence of its recorded run, never an automatic release approval.
  try {
    await cp("docs/market-split-verification.md", path.join(dest, "VERIFICATION.md"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await rm(path.join(dest, market === "cn" ? "global" : "cn"), {
    recursive: true,
    force: true,
  });
  const config = JSON.parse(
    await readFile(`src/features/markets/${market}.json`, "utf8"),
  );
  const manifest = {
    market,
    brand: config.brand,
    entry: `/${market}/`,
    builtAt: new Date().toISOString(),
    sourceCommit: commit,
    workingTreeDirty: dirty,
    prdRevision: prd.revision,
    rulesVersion: standards.rulesVersion,
    configRevision: config.revision,
    accountRealm: config.accountRealm,
    verification:
      "See the accompanying verification report; packaging alone does not assert tests passed.",
  };
  await writeFile(
    path.join(dest, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    path.join(dest, "SERVE.txt"),
    `Serve this directory over HTTP, e.g. python3 -m http.server 8080. Open http://localhost:8080/${market}/. Root is the single-market review entry. Do not use file://. Local simulation only.\n`,
  );
  await cp("docs/auth-flows.md", path.join(dest, "AUTH-FLOWS.md"));
  const archive = path.join(root, market === "cn" ? "baizhi-cn.zip" : "eurekamind-global.zip");
  await rm(path.join(root, `eureka-${market}.zip`), { force: true });
  await rm(archive, { force: true });
  run("zip", ["-qr", archive, "."], { cwd: dest });
  manifests.push(manifest);
}
await writeFile(
  path.join(root, "manifest.json"),
  JSON.stringify(manifests, null, 2) + "\n",
);
// Restore the combined review build used by local/CI acceptance.
run("npm", ["run", "build"], {
  env: {
    ...process.env,
    NEXT_PUBLIC_BASE_PATH: "",
    NEXT_PUBLIC_RELEASE_MARKET: "",
  },
});
console.log(`Market packages written to ${root}`);
