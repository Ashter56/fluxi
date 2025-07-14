import { defineConfig, mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';
import overrideConfig from './vite.config.override.js';
import localConfig from './vite.config.local.js';

// Base configuration with proxy settings
const baseConfig = defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://fluxi-epb6.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
});

// Merge configurations with priority: local > override > base
export default mergeConfig(
  baseConfig,
  overrideConfig,
  localConfig
);
