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
  root: __dirname,
  plugins: [react()], // Removed non-existent plugin
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib')
    }
  },
  
  server: {
    proxy: {
      '/api': {
        target: 'https://fluxi-epb6.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      }
    }
  }
});

// Merge configurations
export default mergeConfig(
  baseConfig,
  overrideConfig,
  localConfig
);
