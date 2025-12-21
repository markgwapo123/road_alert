import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split TensorFlow.js and AI models into separate chunks
          if (id.includes('@tensorflow/tfjs')) {
            return 'tensorflow';
          }
          if (id.includes('@tensorflow-models')) {
            return 'ai-models';
          }
          // Split large node_modules into vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit since AI models are large
  },
  define: {
    'process.env': {}
  }
})
