import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';
import commonjs from '@vitejs/plugin-commonjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    commonjs(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  define: {
    'process.env': {},
  },
  build: {
    outDir: path.resolve(__dirname, "dist"), // Correct output directory
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['lodash', 'axios'],
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
  }
});
