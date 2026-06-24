import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendTarget = process.env.VITE_BACKEND_BASE ?? 'http://localhost:21004'
const backendWsTarget = backendTarget.replace(/^http/, 'ws')

export default defineConfig({
  root: '.',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 28020,
    strictPort: true,
    proxy: {
      // REST APIs (public + auth)
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      // uploaded files (static mapping)
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/avatars': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/backgrounds': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/background-presets': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/news-images': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/cover-images': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/project-files': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/resources': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/music': {
        target: backendTarget,
        changeOrigin: true,
      },
      // websocket
      '/ws': {
        target: backendWsTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 38200,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
})
