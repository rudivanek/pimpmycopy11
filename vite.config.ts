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
    // Ensure we're using HTTP instead of HTTPS for local development
    https: false,
    host: true,
    port: 5173,
    hmr: {
      overlay: false, // Disable the error overlay that appears when there's an error
    },
    open: true,  // Automatically open browser when server starts
    watch: {
      usePolling: true  // Use polling for more reliable file watching
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // Generate source maps for easier debugging
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'react-hot-toast']
        }
      }
    }
  },
  // Optimize dependencies to avoid unnecessary re-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})