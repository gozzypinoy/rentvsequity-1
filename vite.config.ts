import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "apple-touch-icon.png",
        "favicon.svg",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-512.png",
      ],
      manifest: {
        name: "SynthKey",
        short_name: "SynthKey",
        description: "A playable synth keyboard for iPhone and iPad.",
        display: "standalone",
        orientation: "any",
        background_color: "#0b0d12",
        theme_color: "#0b0d12",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
      },
    }),
  ],
});
