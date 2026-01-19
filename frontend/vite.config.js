import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // allowedHosts: ["192.168.123.8.nip.io"], // External Access Mode
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:8088",
        changeOrigin: true,
      },
      "/oauth2/authorization": {
        target: "http://localhost:8088",
        changeOrigin: true,
      },
      "/login/oauth2": {
        target: "http://localhost:8088",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8088",
        changeOrigin: true,
        ws: true,
      },
    },
  }, // server 설정 끝
  build: {
    // server 밖으로 나와야 합니다!
    outDir: "../backend/src/main/resources/static",
    emptyOutDir: true,
  },
});
