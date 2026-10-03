import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        suppressWarnings: true
      },
      manifest: {
        name: 'Academia',
        short_name: 'Academia',
        description: 'Academia Student Portal',
        theme_color: '#1e40af',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: '/logo.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: '/logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpeg,jpg}']
      }
    })
  ]
});
