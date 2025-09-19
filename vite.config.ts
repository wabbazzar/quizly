import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: '/quizly/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      base: '/quizly/',
      manifest: {
        name: 'Quizly - Flashcard Learning',
        short_name: 'Quizly',
        description: 'Advanced flashcard and learning system',
        theme_color: '#4A90E2',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/quizly/',
        start_url: '/quizly/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        navigateFallback: null, // Disable the default navigation fallback
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'deck-data-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
            },
          },
        ],
      },
    }),
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // sunburst, treemap, network
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        // Remove all manual chunks to avoid initialization order issues
        // Let Vite handle all chunking automatically
        chunkFileNames: () => {
          return `assets/[name]-[hash].js`;
        },
        assetFileNames: assetInfo => {
          const extType = assetInfo.name!.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType!)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType!)) {
            return `assets/styles/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },

    // Enable source maps for production debugging (hidden)
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,

    // Optimize CSS
    cssCodeSplit: true,
    cssMinify: true,

    // Asset optimization
    assetsInlineLimit: 4096, // 4KB limit for inlining small assets

    // Chunk size warnings
    chunkSizeWarningLimit: 1000, // Warn for chunks > 1MB
  },

  // Development optimizations
  server: {
    port: 5173,
    open: true,
    cors: true,
  },
  preview: {
    port: 5178,
  },

  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand'],
    exclude: [
      // Large libraries that should be loaded on demand
      '@testing-library/react',
    ],
  },
});
