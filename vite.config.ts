import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/tw-growth-helper/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // autoUpdate = 使用者一回到網站就會自動換到新版，不會卡在舊 SW 的快取。
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'favicon.ico'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,webp,ico}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // SPA 導航 fallback，確保任何子路徑都回到 index.html
          navigateFallback: '/tw-growth-helper/index.html',
        },
        manifest: {
          name: '兒童成長小幫手',
          short_name: '兒童成長小幫手',
          description: '即時計算台灣兒童身高、體重百分位與 BMI，並預估成年目標身高。',
          theme_color: '#FDF8F3',
          background_color: '#FDF8F3',
          display: 'standalone',
          // 明確鎖住 scope / start_url，避免手機把網站裝到錯誤的根路徑
          scope: '/tw-growth-helper/',
          start_url: '/tw-growth-helper/',
          icons: [
            {
              src: '/tw-growth-helper/apple-icon.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/tw-growth-helper/apple-icon.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/tw-growth-helper/apple-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        useCredentials: true,
        // 關掉 dev 時註冊 SW：之前手機端卡舊版最常見的元兇
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
