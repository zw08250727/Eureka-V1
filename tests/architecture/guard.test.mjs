import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { checkArchitecture, fingerprint, inspectSource } from "../../scripts/check-architecture.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eureka-architecture-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write(".gitignore", "out/\npublic/prototype/\n");
  write("tsconfig.json", JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } } }));
  const policy = { htmlFiles: [], legacyJavaScript: [], exceptions: [], frozen: [] };
  return { root, write, policy, check: () => checkArchitecture(root, policy) };
}
const metadata = { owner: "test owner", reason: "test exception", exitCondition: "remove after migration" };

test("React source and generated HTML pass; untracked product HTML fails anywhere in the repository", (t) => {
  const f = fixture(t);
  f.write("src/app/page.tsx", 'export default function Page(){return <button>保存</button>}');
  f.write("out/cn/index.html", "generated");
  f.write("public/prototype/index.html", "generated copy");
  assert.deepEqual(f.check(), []);
  for (const file of ["new-page.html", "public/new-page.HTML", "src/features/cn/new.htm"]) f.write(file, "<button>New product</button>");
  assert.equal(f.check().filter(e => e.message.includes("unregistered HTML")).length, 3);
});

test("PRD HTML remains editable, while historical content edits and additions fail fingerprint checks", (t) => {
  const f = fixture(t), prd = "src/prototype/prd/index.html", legacy = "src/prototype/one-to-one-reference/app.html";
  f.write(prd, "PRD"); f.write(legacy, "frozen");
  f.policy.htmlFiles.push(...[prd, legacy].map(file => ({ file, ...metadata })));
  f.policy.frozen.push({ path: "src/prototype/one-to-one-reference", sha256: fingerprint(f.root, [legacy]), ...metadata });
  f.write(prd, "updated PRD reader");
  assert.deepEqual(f.check(), []);
  f.write(legacy, "changed product rule");
  assert.ok(f.check().some(e => e.message.includes("FE-06")));
  f.write(legacy, "frozen");
  f.write("src/prototype/one-to-one-reference/new.js", "new business logic");
  assert.ok(f.check().some(e => e.message.includes("FE-06")));
});

test("AST finds iframe and storage access but ignores prose and comments", () => {
  const clean = inspectSource("src/features/example.tsx", '// localStorage <iframe>\nconst help = "dangerouslySetInnerHTML"; export const view = <p>localStorage</p>;');
  assert.deepEqual(clean.findings, []);
  for (const code of ['const view=<iframe src="/legacy.html"/>;', 'React.createElement("iframe", {});', 'document.createElement("iframe");'])
    assert.ok(inspectSource("src/features/example.tsx", code).findings.some(e => e.rule === "iframe"));
  for (const code of ['window.localStorage.getItem("x")', 'globalThis["sessionStorage"].clear()', 'const {"localStorage": store} = window;'])
    assert.ok(inspectSource("src/app/example.tsx", code).findings.some(e => e.rule === "storage"));
  assert.deepEqual(inspectSource("src/features/markets/storage.ts", 'window.localStorage.getItem("x")').findings, []);
});

test("HTML injection checks cover JSX props, objects, assignments and imperative insertion", () => {
  for (const code of [
    'const view=<div dangerouslySetInnerHTML={{__html: value}}/>;',
    'const props={dangerouslySetInnerHTML: {__html: value}};',
    'node.innerHTML = value;', 'node["outerHTML"] += value;',
    'node.insertAdjacentHTML("beforeend", value);', 'document.write(value);',
  ]) assert.ok(inspectSource("src/features/example.tsx", code).findings.some(e => e.rule === "html-write"), code);
});

test("a sanitizer exception is exact, count limited and cannot authorize another module", (t) => {
  const f = fixture(t), file = "src/features/meetings/content.tsx";
  const code = 'root.innerHTML = sanitizeRichText(value);';
  const finding = inspectSource(file, code).findings[0];
  f.policy.exceptions.push({ rule: finding.rule, file, signature: finding.signature, maxOccurrences: 1, ...metadata });
  f.write(file, code);
  assert.deepEqual(f.check(), []);
  f.write(file, code + code);
  assert.equal(f.check().length, 1);
  f.write(file, 'root.innerHTML = value;');
  assert.equal(f.check().length, 1);
  f.write(file, code);
  f.write("src/features/other.tsx", code);
  assert.equal(f.check().length, 1);
});

test("UI business dependencies fail directly, via a barrel and via dynamic imports", (t) => {
  const f = fixture(t);
  f.write("src/features/account/model.ts", "export const balance=1;");
  f.write("src/lib/bridge.ts", 'export {balance} from "@/features/account/model";');
  const file = "src/components/ui/badge.tsx";
  for (const code of [
    'import {balance} from "@/features/account/model";',
    'import {balance} from "../../lib/bridge";',
    'const load = () => import("@/features/account/model");',
  ]) {
    f.write(file, code);
    assert.ok(f.check().some(e => e.message.includes("FE-07")), code);
  }
});

test("historical UI import exception does not allow another import from the same module", (t) => {
  const f = fixture(t), file = "src/components/ui/date-filter.tsx";
  const code = 'import {localDay} from "@/features/workbench/model/selectors";';
  f.write("src/features/workbench/model/selectors.ts", "export const localDay=1, balance=2;");
  f.write(file, code);
  f.policy.exceptions.push({ rule: "ui-dependency", file, signature: inspectSource(file, code).imports[0].signature, maxOccurrences: 1, ...metadata });
  assert.deepEqual(f.check(), []);
  f.write(file, 'import {localDay, balance} from "@/features/workbench/model/selectors";');
  assert.ok(f.check().some(e => e.message.includes("FE-07")));
});

test("legacy JavaScript is preserved without permitting new business JavaScript", (t) => {
  const f = fixture(t), file = "src/features/agent/registry.js";
  f.write(file, "export const existing = true;");
  f.policy.legacyJavaScript.push({ file, ...metadata });
  assert.deepEqual(f.check(), []);
  f.write("src/features/agent/new.js", "export const newModule = true;");
  assert.ok(f.check().some(e => e.message.includes("FE-01")));
});
