import { defineConfig } from 'vitest/config'
import path from 'path'
import react from '@vitejs/plugin-react'

const hmrProtocol = (process.env.VITE_HMR_PROTOCOL as 'ws' | 'wss' | undefined) || 'ws'
const hmrHost = process.env.VITE_HMR_HOST || undefined
const hmrPort = Number(process.env.VITE_HMR_PORT || 5173)
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || process.env.VITE_HMR_PORT || 5173)

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils.tsx'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true, // ✅ CORRECT: Must be boolean true, not 'all'
    open: false,
    cors: true,
    hmr: {
      // Explicit HMR websocket settings fix common localhost/proxy websocket failures.
      protocol: hmrProtocol,
      // Keep host undefined by default so browser hostname is used (works for localhost/LAN/tunnels).
      host: hmrHost,
      port: hmrPort,
      clientPort: hmrClientPort,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Use esbuild minifier which is faster and avoids some terser hoisting bugs
    // that can surface as "Cannot access 'l' before initialization" in bundled
    // vendor chunks for certain chart libraries.
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      onwarn(warning, warn) {
        const message = String(warning?.message || '')
        const source = String((warning as any)?.id || '')
        const isReactHelmetPureAnnotationWarning =
          warning?.code === 'INVALID_ANNOTATION' &&
          source.includes('react-helmet-async/lib/index.module.js') &&
          message.includes('annotation that Rollup cannot interpret')

        // Known upstream package annotation placement warning; safe to ignore.
        if (isReactHelmetPureAnnotationWarning) return
        warn(warning)
      },
      output: {
        manualChunks(id) {
            if (id.includes('node_modules')) {
            if (id.includes('agora-rtc-sdk-ng')) return 'vendor-agora'
            if (id.includes('lucide-react')) return 'vendor-icons'
            // Avoid creating a separate 'vendor-charts' chunk — keep chart libraries
            // in the generic vendor bundle to prevent problematic minification
            // ordering that can cause runtime ReferenceErrors in certain builds.
            if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-realtime'
            if (id.includes('pdfkit')) return 'vendor-pdf'
            return 'vendor'
          }

          if (id.includes('/src/pages/patient/')) return 'pages-patient'
          if (id.includes('/src/pages/therapist/')) return 'pages-therapist'
          if (id.includes('/src/pages/psychiatrist/')) return 'pages-psychiatrist'
          if (id.includes('/src/pages/admin/')) return 'pages-admin'
          if (id.includes('/src/components/')) return 'components-core'
          if (id.includes('/src/api/')) return 'api-core'
          if (id.includes('/src/lib/')) return 'lib-core'
        },
      },
    },
    chunkSizeWarningLimit: 1400,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true, // ✅ CORRECT: Must be boolean true, not 'all'
    cors: true,
  },
})
