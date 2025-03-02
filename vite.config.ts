import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    // Define process.env for environment variable access
    'process.env': process.env
  },
  build: {
    outDir: 'dist/client', // Output to dist/client to match the server code
  },
  server: {
    host: true, // This will make Vite listen on all network interfaces
    proxy: {
      // Forward API requests to the Express server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
