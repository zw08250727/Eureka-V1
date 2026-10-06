import { spawnSync } from "node:child_process";
const cwd = "src/prototype/one-to-one-reference";
const tests = ["workspace-model.cjs", "contacts-model.cjs", "apps-grid-tools.cjs", "apps-editing.cjs", "apps-data-permissions.cjs", "apps-table-export.test.cjs"];
for (const test of tests) {
  const result = spawnSync(process.execPath, ["tests/" + test], { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
