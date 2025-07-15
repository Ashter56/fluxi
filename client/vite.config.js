import path from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import overrideConfig from './vite.config.override.js';
import localConfig from './vite.config.local.js';

// Get current directory path (critical fix)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base configuration with proxy settings
const baseConfig = defineConfig({
  // Explicit root path declaration (fixes deployment errors)
  root: path.resolve(__dirname),
  
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
  
  // Build output directory (explicit path)
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
});

// Merge configurations with priority: local > override > base
export default mergeConfig(
  baseConfig,
  overrideConfig,
  localConfig
);
