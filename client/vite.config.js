console.log("Vite configuration loaded");
console.log("Current directory:", __dirname);
console.log("Environment:", process.env.NODE_ENV);
import path from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import overrideConfig from './vite.config.override.js';
import localConfig from './vite.config.local.js';

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base configuration
const baseConfig = defineConfig({
  root: __dirname,
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib')
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
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
