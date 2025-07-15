import path from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import overrideConfig from './vite.config.override.js';
import localConfig from './vite.config.local.js';

// Get current directory path (client folder)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base configuration with proxy settings
const baseConfig = defineConfig({
  // Explicit root path to client folder
  root: __dirname,
  
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://fluxi-epb6.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  
  // Build output directory inside client
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
});

// Merge configurations
export default mergeConfig(
  baseConfig,
  overrideConfig,
  localConfig
);
