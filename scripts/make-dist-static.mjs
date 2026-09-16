import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const glbPath = resolve(dist, "models/cloid-hero.glb");

function inlineGlb(jsPath) {
  let js = readFileSync(jsPath, "utf8");
  const needles = ["./models/cloid-hero.glb", "models/cloid-hero.glb"];
  if (!needles.some((token) => js.includes(token))) return;

  const dataUri = `data:model/gltf-binary;base64,${readFileSync(glbPath).toString("base64")}`;
  js = js.replaceAll("./models/cloid-hero.glb", dataUri);
  writeFileSync(jsPath, js);
}

async function flatten(htmlName, outJsName) {
  const htmlPath = resolve(dist, htmlName);
  let html = readFileSync(htmlPath, "utf8");

  const scriptMatch = html.match(/src="\.\/assets\/([^"]+\.js)"/);
  if (!scriptMatch) {
    throw new Error(`${htmlName} 에서 엔트리 스크립트를 찾지 못했습니다.`);
  }

  const outJsPath = resolve(dist, "assets", outJsName);
  await build({
    absWorkingDir: dist,
    entryPoints: [resolve(dist, "assets", scriptMatch[1])],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: outJsPath,
    logLevel: "silent",
  });

  inlineGlb(outJsPath);

  html = html
    .replace(/<script type="importmap">[\s\S]*?<\/script>/g, "")
    .replace(/<script type="module"[^>]*><\/script>/g, "")
    .replace(/<link rel="modulepreload"[^>]*>/g, "")
    .replace(/\s+crossorigin(?:="[^"]*")?/g, "")
    .replace(
      "</body>",
      `    <script src="./assets/${outJsName}"></script>\n  </body>`,
    );

  writeFileSync(htmlPath, html);
}

await flatten("index.html", "type1.js");
await flatten("index2.html", "type2.js");
console.log("dist HTML을 file:// 에서도 열리도록 변환했습니다.");
