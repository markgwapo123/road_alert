import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow external connections
    port: 5173, // Set a specific port
    strictPort: false, // Allow fallback to other ports if 5173 is in use
    cors: true, // Enable CORS for mobile testing
  },
  preview: {
    host: true, // Also enable for preview builds
    port: 4173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  define: {
    'process.env': {}
  }
})
