import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const sourcePattern = /\.(?:[cm]?[jt]s|[jt]sx)$/i;
const javascriptPattern = /\.(?:[cm]?js|jsx)$/i;
const printer = ts.createPrinter({ removeComments: true });
const normalize = (value) => value.split(path.sep).join("/");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const currentSource = (file) => file.startsWith("src/") &&
  !file.startsWith("src/prototype/") && sourcePattern.test(file);
const literal = (node) => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
const property = (node) => ts.isPropertyAccessExpression(node) ? node.name.text :
  ts.isElementAccessExpression(node) ? literal(node.argumentExpression) : undefined;

// Syntax inspection deliberately ignores comments and ordinary strings.
export function inspectSource(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const findings = [], imports = [];
  const signature = (node) => printer.printNode(ts.EmitHint.Unspecified, node, source);
  function report(rule, node, message) {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    findings.push({ rule, file, line, signature: signature(node), message });
  }
  function dependency(node, value) {
    if (value) imports.push({ specifier: value, signature: signature(node), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) dependency(node, literal(node.moduleSpecifier));
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) dependency(node, literal(node.moduleReference.expression));
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) dependency(node, literal(node.argument.literal));
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === "require")) dependency(node, literal(node.arguments[0]));

    if (file !== "src/features/markets/storage.ts" && (
      (ts.isIdentifier(node) && /^(localStorage|sessionStorage)$/.test(node.text)) ||
      (ts.isElementAccessExpression(node) && /^(localStorage|sessionStorage)$/.test(literal(node.argumentExpression) || "")) ||
      (ts.isBindingElement(node) && /^(localStorage|sessionStorage)$/.test(literal(node.propertyName) || ""))
    )) report("storage", node, "FE-08: use marketStorage / marketSessionStorage");

    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source).toLowerCase() === "iframe")
      report("iframe", node, "FE-03: business iframe is forbidden");
    if (ts.isCallExpression(node) && ["createElement", "jsx", "jsxs", "jsxDEV"].includes(property(node.expression) || node.expression.getText(source)) && literal(node.arguments[0])?.toLowerCase() === "iframe")
      report("iframe", node, "FE-03: iframe element creation is forbidden");

    if (ts.isBinaryExpression(node) && ts.isAssignmentOperator(node.operatorToken.kind) && ["innerHTML", "outerHTML"].includes(property(node.left)))
      report("html-write", node, "FE-03: HTML writes require an exact content-rendering exception");
    if (ts.isJsxAttribute(node) && node.name.getText(source) === "dangerouslySetInnerHTML")
      report("html-write", node, "FE-03: raw HTML rendering requires a registered sanitizer boundary");
    if (ts.isPropertyAssignment(node) && (literal(node.name) || node.name.getText(source)) === "dangerouslySetInnerHTML")
      report("html-write", node, "FE-03: raw HTML props require a registered sanitizer boundary");
    if (ts.isCallExpression(node) && (property(node.expression) === "insertAdjacentHTML" ||
      (["write", "writeln"].includes(property(node.expression)) && /^(?:window\.|globalThis\.)?document$/.test(node.expression.expression.getText(source)))))
      report("html-write", node, "FE-03: imperative HTML insertion is forbidden outside registered content boundaries");
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { findings, imports };
}

export function repositoryFiles(root) {
  return [...new Set(execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean))]
    .filter((file) => fs.existsSync(path.join(root, file))).sort();
}

export function fingerprint(root, files) {
  return digest(files.slice().sort().map((file) => `${file}\0${digest(fs.readFileSync(path.join(root, file)))}\0`).join(""));
}

function exceptionFor(policy, rule, file, signature) {
  return policy.exceptions.find((item) => item.rule === rule && item.file === file && item.signature === signature);
}

export function checkArchitecture(root, policy) {
  const files = repositoryFiles(root), errors = [], parsed = new Map();
  const allowedHtml = new Set(policy.htmlFiles.map((entry) => entry.file));
  const legacyJs = new Set(policy.legacyJavaScript.map((entry) => entry.file));
  const uses = new Map();
  const add = (finding) => {
    const exception = exceptionFor(policy, finding.rule, finding.file, finding.signature);
    if (exception) {
      const count = (uses.get(exception) || 0) + 1;
      uses.set(exception, count);
      if (count <= exception.maxOccurrences) return;
    }
    errors.push(finding);
  };
  // Precise, reviewable registrations; a missing owner/reason cannot silently widen scope.
  for (const entry of [...policy.htmlFiles, ...policy.legacyJavaScript, ...policy.exceptions, ...policy.frozen]) {
    if (!entry.reason || !entry.owner || !entry.exitCondition) errors.push({ file: "spc/architecture-policy.json", message: "Every exception needs reason, owner and exitCondition" });
  }
  for (const file of files) {
    if (/\.html?$/i.test(file) && !allowedHtml.has(file)) errors.push({ file, message: "FE-02/03: unregistered HTML file; implement product UI in React" });
    if (!currentSource(file)) continue;
    if (javascriptPattern.test(file) && !legacyJs.has(file)) errors.push({ file, message: "FE-01: new application source must use TypeScript" });
    const result = inspectSource(file, fs.readFileSync(path.join(root, file), "utf8"));
    parsed.set(file, result);
    result.findings.forEach(add);
  }
  for (const entry of policy.frozen) {
    const selected = files.filter((file) => file === entry.path || file.startsWith(entry.path + "/"));
    if (!selected.length || fingerprint(root, selected) !== entry.sha256)
      errors.push({ file: entry.path, message: "FE-06: frozen source / generated baseline changed; do not rebaseline to implement product changes" });
  }

  const configFile = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(configFile.config || { compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } } }, ts.sys, root).options;
  const cache = ts.createModuleResolutionCache(root, (name) => name, options);
  function resolve(from, specifier) {
    const resolved = ts.resolveModuleName(specifier, path.join(root, from), options, ts.sys, cache).resolvedModule;
    return resolved ? normalize(path.relative(root, resolved.resolvedFileName)) : undefined;
  }
  for (const start of parsed.keys()) {
    if (!start.startsWith("src/components/ui/")) continue;
    const seen = new Set();
    function walk(file, chain) {
      if (seen.has(file)) return;
      seen.add(file);
      for (const edge of parsed.get(file)?.imports || []) {
        // Only the exact historical import is grandfathered; other imports in that file still fail.
        if (exceptionFor(policy, "ui-dependency", file, edge.signature)) continue;
        const target = resolve(file, edge.specifier);
        if (!target) continue;
        if (/^src\/(?:features|app|prototype)\//.test(target)) {
          errors.push({ file: start, line: start === file ? edge.line : undefined, message: `FE-07: UI depends on business code: ${[...chain, target].join(" -> ")}` });
        } else if (parsed.has(target)) walk(target, [...chain, target]);
      }
    }
    walk(start, [start]);
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const policy = JSON.parse(fs.readFileSync(path.join(root, "spc/architecture-policy.json"), "utf8"));
  const errors = checkArchitecture(root, policy);
  if (errors.length) {
    for (const error of errors) console.error(`${error.file}${error.line ? `:${error.line}` : ""}: ${error.message}`);
    process.exitCode = 1;
  } else console.log("Architecture passed: React source, registered HTML, market storage, UI dependencies and frozen baselines.");
}
