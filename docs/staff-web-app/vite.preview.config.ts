// Preview config for running the staff web system inside the sandbox so Chapman
// can see it in the chat. This is NOT part of the staff project. Keep the real
// vite.config.ts untouched.
//
// Use it like this, from the staff project folder:
//   npx vite --config vite.local.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig({
  plugins: [svgr(), react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: "wss" },
  },
});
