import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/WebGl/" : "/",
  server: {
    port: 5173,
    host: true,
    open: false,
  },
}));
