import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { createNotionTodoResponse } from "./api/notion/handler";

const notionDevMiddleware = () => ({
  name: "notion-dev-middleware",
  configureServer(
    server: {
      middlewares: {
        use: (
          path: string,
          handler: (
            req: import("node:http").IncomingMessage,
            res: import("node:http").ServerResponse,
            next: () => void,
          ) => void | Promise<void>,
        ) => void;
      };
    },
  ) {
    server.middlewares.use("/api/notion/todo", async (req, res, next) => {
      if (req.method !== "GET" && req.method !== "POST") {
        next();
        return;
      }

      try {
        const body = await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
          if (req.method !== "POST") {
            resolve(undefined);
            return;
          }

          let raw = "";
          req.on("data", (chunk) => {
            raw += chunk;
          });
          req.on("end", () => {
            if (raw === "") {
              resolve({});
              return;
            }

            try {
              resolve(JSON.parse(raw));
            } catch (error) {
              reject(error);
            }
          });
          req.on("error", reject);
        });

        const url = new URL(req.url ?? "/api/notion/todo", "http://localhost");
        const response = await createNotionTodoResponse({
          method: req.method,
          searchParams: url.searchParams,
          body,
        });

        res.statusCode = response.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(response.body));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Failed to handle Notion sync request" }));
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (env.NOTION_API_KEY && !process.env.NOTION_API_KEY) {
    process.env.NOTION_API_KEY = env.NOTION_API_KEY;
  }

  return {
    plugins: [
      react(),
      notionDevMiddleware(),
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
            if (id.includes("@mui/material") || id.includes("@emotion/react") || id.includes("@emotion/styled")) {
              return "mui-core";
            }
            if (id.includes("@mui/icons-material")) {
              return "mui-icons";
            }
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            if (id.includes("framer-motion")) {
              return "vendor-animation";
            }
            if (id.includes("@react-oauth/google") || id.includes("gapi-script") || id.includes("axios")) {
              return "vendor-google";
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
