// vite.config.js
import { defineConfig } from "file:///sessions/awesome-exciting-wright/mnt/cleanwear/cleanwear-app/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/awesome-exciting-wright/mnt/cleanwear/cleanwear-app/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///sessions/awesome-exciting-wright/mnt/cleanwear/cleanwear-app/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.svg", "icon-512.svg"],
      manifest: {
        name: "CleanWear",
        short_name: "CleanWear",
        description: "Know what's really in your clothes. Scan any garment for hidden chemicals.",
        theme_color: "#030a03",
        background_color: "#030a03",
        display: "standalone",
        start_url: "/#app",
        scope: "/",
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvYXdlc29tZS1leGNpdGluZy13cmlnaHQvbW50L2NsZWFud2Vhci9jbGVhbndlYXItYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMvYXdlc29tZS1leGNpdGluZy13cmlnaHQvbW50L2NsZWFud2Vhci9jbGVhbndlYXItYXBwL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy9hd2Vzb21lLWV4Y2l0aW5nLXdyaWdodC9tbnQvY2xlYW53ZWFyL2NsZWFud2Vhci1hcHAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5zdmcnLCAnaWNvbi0xOTIuc3ZnJywgJ2ljb24tNTEyLnN2ZyddLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ0NsZWFuV2VhcicsXG4gICAgICAgIHNob3J0X25hbWU6ICdDbGVhbldlYXInLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0tub3cgd2hhdFxcJ3MgcmVhbGx5IGluIHlvdXIgY2xvdGhlcy4gU2NhbiBhbnkgZ2FybWVudCBmb3IgaGlkZGVuIGNoZW1pY2Fscy4nLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyMwMzBhMDMnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzAzMGEwMycsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLyNhcHAnLFxuICAgICAgICBzY29wZTogJy8nLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJy9pY29uLTE5Mi5zdmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9zdmcreG1sJyxcbiAgICAgICAgICAgIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnL2ljb24tNTEyLnN2ZycsXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIHNraXBXYWl0aW5nOiB0cnVlLFxuICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxzdmcscG5nLHdvZmYyfSddLFxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC5nb29nbGVhcGlzXFwuY29tXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ29vZ2xlLWZvbnRzLWNhY2hlJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAxMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0sXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7IHN0YXR1c2VzOiBbMCwgMjAwXSB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC5nc3RhdGljXFwuY29tXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ3N0YXRpYy1mb250cy1jYWNoZScsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZTogeyBzdGF0dXNlczogWzAsIDIwMF0gfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5VyxTQUFTLG9CQUFvQjtBQUN0WSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLGdCQUFnQixjQUFjO0FBQUEsTUFDN0QsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFFBQ1AsT0FBTztBQUFBLFVBQ0w7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLFNBQVM7QUFBQSxVQUNYO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBLFFBQ1AsYUFBYTtBQUFBLFFBQ2IsY0FBYztBQUFBLFFBQ2QsY0FBYyxDQUFDLGtDQUFrQztBQUFBLFFBQ2pELGdCQUFnQjtBQUFBLFVBQ2Q7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVM7QUFBQSxjQUNQLFdBQVc7QUFBQSxjQUNYLFlBQVksRUFBRSxZQUFZLElBQUksZUFBZSxLQUFLLEtBQUssS0FBSyxJQUFJO0FBQUEsY0FDaEUsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLEdBQUcsR0FBRyxFQUFFO0FBQUEsWUFDMUM7QUFBQSxVQUNGO0FBQUEsVUFDQTtBQUFBLFlBQ0UsWUFBWTtBQUFBLFlBQ1osU0FBUztBQUFBLFlBQ1QsU0FBUztBQUFBLGNBQ1AsV0FBVztBQUFBLGNBQ1gsWUFBWSxFQUFFLFlBQVksSUFBSSxlQUFlLEtBQUssS0FBSyxLQUFLLElBQUk7QUFBQSxjQUNoRSxtQkFBbUIsRUFBRSxVQUFVLENBQUMsR0FBRyxHQUFHLEVBQUU7QUFBQSxZQUMxQztBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
