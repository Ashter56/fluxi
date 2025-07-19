import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';
import commonjs from '@vitejs/plugin-commonjs'; // Add this

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    commonjs(), // Add this plugin
    // ... other plugins
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  define: {
    'process.env': process.env, // Add process.env polyfill
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist", "public"),
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true, // Enable CJS/ESM interop
    },
  },
});
