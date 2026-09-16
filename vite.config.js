import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "strip-dev-only-html",
      apply: "build",
      transformIndexHtml(html) {
        return html.replace(
          /<script type="importmap">[\s\S]*?<\/script>/,
          "",
        );
      },
    },
  ],
  build: {
    modulePreload: false,
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        type2: resolve(root, "index2.html"),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    open: false,
  },
});
