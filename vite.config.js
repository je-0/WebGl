import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/WebGl/" : "/",
  build: {
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
}));
