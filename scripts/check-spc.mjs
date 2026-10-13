import { readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
const read = async (path) => JSON.parse(await readFile(path, "utf8"));
const modules = await read("spc/modules.json");
const rules = await readFile("spc/business-baseline.md", "utf8");
const ids = new Set(modules.modules.map((m) => m.id));
for (const m of modules.modules) {
  assert(
    m.owner && m.status && m.rules.length && m.sources.length,
    `Incomplete module ${m.id}`,
  );
  for (const d of m.dependencies) assert(ids.has(d), `Unknown dependency ${d}`);
  for (const r of m.rules)
    assert(rules.includes(`| ${r} |`), `Missing rule ${r}`);
  for (const source of m.sources) await access(source);
}
const configs = [];
for (const market of ["cn", "global"]) {
  const c = await read(`src/features/markets/${market}.json`);
  configs.push(c);
  assert(
    c.id === market && c.revision && c.status && c.accountRealm && c.agent.id,
  );
  assert(c.providers.length >= 2 && c.connectors.length > 0);
  assert(new Set(c.connectors.map((x) => x.id)).size === c.connectors.length);
  for (const p of [...Object.values(c.personal), ...c.credits])
    assert(p.amount > 0);
  assert(c.benefits.proCredits > 0 && c.rates.perTokens > 0);
}
assert.notEqual(configs[0].accountRealm, configs[1].accountRealm);
assert.notEqual(configs[0].agent.id, configs[1].agent.id);
// Source boundaries are checked by check:architecture using ASTs, including app, UI and lib.
console.log(
  `SPC passed: ${modules.modules.length} modules and two account realm configurations.`,
);
