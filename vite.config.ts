import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@assets": path.resolve(__dirname, "client/attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "client/dist"),
    emptyOutDir: true,
    sourcemap: true, // Added for production debugging
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'], // Added
          forms: ['react-hook-form', 'zod'] // Added
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: false // Disable HMR completely
  },
  define: {
    // Ensure environment variable is available to client
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
});
