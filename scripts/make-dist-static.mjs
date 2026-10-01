import { build } from "esbuild";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const glbSrc = [
  resolve(dist, "models/cloid-hero.glb"),
  resolve(root, "public/models/cloid-hero.glb"),
].find((path) => existsSync(path));

if (!glbSrc) throw new Error("cloid-hero.glb 를 찾지 못했습니다.");

mkdirSync(resolve(dist, "models"), { recursive: true });
copyFileSync(glbSrc, resolve(dist, "models/cloid-hero.glb"));

const DAM_MODEL_URL = "/content/dam/cloid/cloid-hero.glb";

function modelUrlScript(url) {
  return `<script>window.CLOID_MODEL_URL = ${JSON.stringify(url)};</script>`;
}

function findEntry(htmlName) {
  const html = readFileSync(resolve(dist, htmlName), "utf8");
  const match = html.match(/src="(?:\.\/)?assets\/([^"]+\.js)"/);
  if (!match) throw new Error(`${htmlName} 에서 엔트리 스크립트를 찾지 못했습니다.`);
  return resolve(dist, "assets", match[1]);
}

async function bundleIife(entryPath, outfile) {
  await build({
    absWorkingDir: dist,
    entryPoints: [entryPath],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile,
    logLevel: "silent",
  });
}

function collectLocalCss(html) {
  const parts = [];
  for (const match of html.matchAll(
    /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi,
  )) {
    const href = match[1];
    if (/^https?:\/\//i.test(href)) continue;
    const cssPath = resolve(dist, href.replace(/^\.\//, ""));
    if (!existsSync(cssPath)) {
      throw new Error(`CSS 파일을 찾지 못했습니다: ${href}`);
    }
    parts.push(readFileSync(cssPath, "utf8"));
  }
  return parts.join("\n");
}

function keepRemoteLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter(
      (tag) =>
        /rel="stylesheet"/i.test(tag) &&
        /href="https?:\/\//i.test(tag),
    )
    .join("\n    ");
}

async function flatten(htmlName, jsName, { modelUrl } = {}) {
  const htmlPath = resolve(dist, htmlName);
  let html = readFileSync(htmlPath, "utf8");
  mkdirSync(resolve(dist, "assets"), { recursive: true });
  const jsPath = resolve(dist, "assets", jsName);
  await bundleIife(findEntry(htmlName), jsPath);

  const css = collectLocalCss(html);
  const remoteLinks = keepRemoteLinks(html);

  html = html
    .replace(/<script type="importmap">[\s\S]*?<\/script>/g, "")
    .replace(/<script\b[^>]*><\/script>/g, "")
    .replace(/<link rel="modulepreload"[^>]*>/g, "")
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, "")
    .replace(/\s+crossorigin(?:="[^"]*")?/g, "");

  const headExtras = [
    remoteLinks,
    css ? `<style>\n${css}\n    </style>` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  html = html.replace("</head>", `    ${headExtras}\n  </head>`);
  const scripts = [
    modelUrl ? `    ${modelUrlScript(modelUrl)}` : "",
    `    <script src="./assets/${jsName}"></script>`,
  ]
    .filter(Boolean)
    .join("\n");
  html = html.replace("</body>", `${scripts}\n  </body>`);

  writeFileSync(htmlPath, html);
}

const AEM_CSS = `    .type-bust {
      --bg: #f6f1e8;
      --ink: #2c2924;
      --muted: rgba(44, 41, 36, 0.52);
      --line: rgba(44, 41, 36, 0.14);
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      min-height: 100vh;
      overflow: hidden;
      position: relative;
      cursor: auto;
      color: var(--ink);
      font-family: Pretendard, Manrope, "Apple SD Gothic Neo", sans-serif;
      background:
        radial-gradient(ellipse 42% 48% at 92% 0%, #fffdf8 0%, transparent 58%),
        linear-gradient(90deg, #e7e1d6, #efeae1 42%, #e8e2d7);
    }
    .type-bust *,
    .type-bust *::before,
    .type-bust *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .type-bust #webgl {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: block;
      z-index: 2;
      background: transparent;
    }
    .type-bust .grain {
      display: none;
    }
    .type-bust .overlay {
      display: none;
    }
    .type-bust .cursor {
      display: none;
    }
    .type-bust .hero-copy {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 0 4vw;
      pointer-events: none;
      -webkit-user-select: none;
      user-select: none;
    }
    .type-bust .hero-robots,
    .type-bust .hero-tag {
      margin: 0;
      font-family: Outfit, Manrope, Pretendard, sans-serif;
      font-weight: 200;
      color: #9c968db8;
      text-align: center;
      white-space: nowrap;
    }
    .type-bust .hero-robots {
      font-size: clamp(80px, 18.4vw, 268px);
      line-height: 0.82;
      letter-spacing: 0.14em;
      padding-left: 0.14em;
    }
    .type-bust .hero-tag {
      margin-top: 0.12em;
      font-size: clamp(22px, 5.15vw, 70px);
      line-height: 1;
      letter-spacing: 0.22em;
      padding-left: 0.22em;
      color: #a49e959e;
    }
    .type-bust .scroll-hint {
      position: absolute;
      right: 36px;
      bottom: 28px;
      z-index: 4;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #6d675e;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-decoration: none;
      pointer-events: auto;
    }
    .type-bust .scroll-icon {
      width: 26px;
      height: 26px;
      border: 1px solid rgba(109, 103, 94, 0.7);
      border-radius: 50%;
      position: relative;
    }
    .type-bust .scroll-icon:after {
      content: "";
      position: absolute;
      top: 7px;
      left: 8px;
      width: 8px;
      height: 8px;
      border-right: 1px solid #6d675e;
      border-bottom: 1px solid #6d675e;
      transform: rotate(45deg);
    }
    @media (max-width: 720px) {
      .type-bust .scroll-hint {
        right: 18px;
        bottom: 18px;
      }
      .type-bust .hero-robots {
        letter-spacing: 0.08em;
        padding-left: 0.08em;
      }
      .type-bust .hero-tag {
        letter-spacing: 0.08em;
        white-space: normal;
        max-width: 92vw;
      }
    }`;

async function makeAem() {
  await bundleIife(findEntry("index2.html"), resolve(dist, "aem.js"));
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aether — Type 02 Bust</title>
    <style>
${AEM_CSS}
    </style>
  </head>
  <body class="type-bust">
    <div class="hero-copy" aria-hidden="true">
      <p class="hero-robots">ROBOTS</p>
      <p class="hero-tag">FOR THE WAY WE LIVE</p>
    </div>
    <canvas id="webgl"></canvas>
    <div class="grain" aria-hidden="true"></div>
    <a class="scroll-hint" href="#top">
      Scroll Down
      <span class="scroll-icon" aria-hidden="true"></span>
    </a>
    ${modelUrlScript(DAM_MODEL_URL)}
    <script src="./aem.js"></script>
  </body>
</html>
`;
  writeFileSync(resolve(dist, "aem.html"), html);
}

await flatten("index2.html", "type2.js", { modelUrl: "./models/cloid-hero.glb" });

const KEEP = new Set([
  "index2.html",
  "assets/type2.js",
  "models/cloid-hero.glb",
]);

function cleanDist(dir = dist, rel = "") {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      cleanDist(full, relPath);
      if (readdirSync(full).length === 0) rmSync(full, { recursive: true });
      continue;
    }
    if (!KEEP.has(relPath.replaceAll("\\", "/"))) rmSync(full);
  }
}

cleanDist();
console.log("dist/index2.html + dist/assets/type2.js + dist/models/cloid-hero.glb");
