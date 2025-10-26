import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "Fleet Monitoring Dashboard",
        short_name: "Fleet",
        description: "Sistema de monitoreo IoT con soporte offline",
        theme_color: "#2563eb",
        background_color: "#111827",
        display: "standalone",
        start_url: "/",
        icons: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
            },
          },
          {
            urlPattern: /.*\.(?:js|css|png|jpg|jpeg|svg|woff2)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
            },
          },
          {
            urlPattern: /^https:\/\/(tiles\.openstreetmap\.org|api\.maptiler\.com|tile\.openstreetmap\.fr)\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 días
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/(cdn\.maptiler\.com|api\.mapbox\.com|basemaps\.cartocdn\.com)\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-styles",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
})
