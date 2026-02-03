import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@music-player/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // MUIを別チャンクに分離（最大のライブラリ）
          'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'mui-icons': ['@mui/icons-material'],
          // Reactを別チャンクに分離
          'vendor-react': ['react', 'react-dom'],
          // アニメーションライブラリを分離
          'vendor-animation': ['framer-motion'],
          // Google関連のライブラリを分離
          'vendor-google': ['@react-oauth/google', 'gapi-script', 'axios'],
        },
      },
    },
    // チャンクサイズの警告を1000KBに設定（分割後は問題なくなる）
    chunkSizeWarningLimit: 1000,
  },
});
