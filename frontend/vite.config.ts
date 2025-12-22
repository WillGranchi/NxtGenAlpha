import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      'nxtgenalpha.com',
      'www.nxtgenalpha.com',
      '.railway.app',
      'localhost'
    ]
  },
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: '0.0.0.0',
    strictPort: false,
    allowedHosts: [
      'nxtgenalpha.com',
      'www.nxtgenalpha.com',
      '.railway.app',
      'localhost'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})