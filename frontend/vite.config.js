import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // proxy: {
    //   '/api': { target: 'http://localhost:8088', changeOrigin: true,},
    //   // 소셜 로그인 경로도 localhost:8088로 보내달라고 명시!
    //   '/oauth2': { target: 'http://localhost:8088', changeOrigin: true },
    //   '/login/oauth2': { target: 'http://localhost:8088', changeOrigin: true },
    // },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true
      },
      '/oauth2': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true
      },
      '/login/oauth2': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true
      },
    },
  }, // server 설정 끝
  build: { // server 밖으로 나와야 합니다!
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  }
})
