import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/tw-growth-helper/',
    plugins: [
      react(),
      tailwindcss(),
VitePWA({
        registerType: 'prompt',
        includeAssets: ['apple-touch-icon.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true
        },
        manifest: {
          name: '兒童成長小幫手',
          short_name: '兒童成長小幫手',
          description: '即時計算台灣兒童身高、體重百分位與 BMI，並預估成年目標身高。',
          theme_color: '#FDF8F3',
          background_color: '#FDF8F3',
          display: 'standalone',
          icons: [
            {
              src: '/tw-growth-helper/apple-icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/tw-growth-helper/apple-icon.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/apple-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }, // <--- manifest 到這裡結束
        useCredentials: true, 
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
