import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import commonjs from '@vitejs/plugin-commonjs';

export default defineConfig({
  root: path.resolve(__dirname, "client"),  // Point to client source
  plugins: [
    react(),
    commonjs(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@assets": path.resolve(__dirname, "client/attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "client/dist"),  // Output to client/dist
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
  }
});
