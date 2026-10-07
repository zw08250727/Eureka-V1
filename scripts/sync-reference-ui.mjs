/** Preserve the frozen prototype's cascade and symbols. No styles are redesigned here. */
import fs from "node:fs";
import path from "node:path";
const write = (file, value) => {
  if (process.argv.includes("--check")) {
    if (fs.readFileSync(file, "utf8") !== value)
      throw Error(`Reference UI drift: ${file}; run npm run sync:ui`);
  } else fs.writeFileSync(file, value);
};
const root = "src/prototype/one-to-one-reference";
const html = fs.readFileSync(path.join(root, "team-only-app.html"), "utf8");
const parts = [];
const injected = html.match(/style\.textContent = `([\s\S]*?)`;/)?.[1];
for (const match of html.matchAll(
  /<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*rel="stylesheet"[^>]*>/g,
)) {
  if (match[1] !== undefined) parts.push(match[1]);
  else {
    const href = match[0].match(/href="([^"]+)"/)[1].split("?")[0];
    if (href === "assets/workspace-ui.css" && injected)
      parts.push(
        "/* Original runtime style block, appended to head */\n" + injected,
      );
    parts.push(
      `/* Original source: ${href} */\n` +
        fs.readFileSync(path.join(root, href), "utf8"),
    );
  }
}
write(
  "src/features/reference/prototype.css",
  "/* Generated verbatim from the frozen prototype cascade by scripts/sync-reference-ui.mjs. */\n" +
    parts.join("\n"),
);
const symbols = [...html.matchAll(/<symbol\b[\s\S]*?<\/symbol>/g)]
  .map((m) => m[0])
  .join("\n")
  .replace(
    /([\w]+)-([a-z])([\w-]*)=/g,
    (_, a, b, c) => a + b.toUpperCase() + c + "=",
  );
write(
  "src/features/reference/symbols.tsx",
  `// SVG paths copied from team-only-app.html; keep the original viewBoxes.\nexport function Symbols(){return <svg xmlns="http://www.w3.org/2000/svg" style={{position:"absolute",width:0,height:0,overflow:"hidden"}} aria-hidden="true">${symbols}</svg>;}\nexport function RefIcon({name,className="icon"}:{name:string;className?:string}){return <svg className={className} aria-hidden="true"><use href={"#ico-"+name}/></svg>;}\n`,
);
