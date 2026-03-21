import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "GD-Player",
        short_name: "GD-Player",
        description: "A retro-futuristic music player for Google Drive",
        theme_color: "#1a0033",
        background_color: "#1a0033",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // MUIを別チャンクに分離（最大のライブラリ）
          if (id.includes('@mui/material') || id.includes('@emotion/react') || id.includes('@emotion/styled')) {
            return 'mui-core';
          }
          if (id.includes('@mui/icons-material')) {
            return 'mui-icons';
          }
          // Reactを別チャンクに分離
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          // アニメーションライブラリを分離
          if (id.includes('framer-motion')) {
            return 'vendor-animation';
          }
          // Google関連のライブラリを分離
          if (id.includes('@react-oauth/google') || id.includes('gapi-script') || id.includes('axios')) {
            return 'vendor-google';
          }
        },
      },
    },
    // チャンクサイズの警告を1000KBに設定（分割後は問題なくなる）
    chunkSizeWarningLimit: 1000,
  },
});
