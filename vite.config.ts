import viteCompression from 'vite-plugin-compression';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [
    react(),
    viteCompression({ 
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024 
    }),
    viteCompression({ 
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024 
    })
  ],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

