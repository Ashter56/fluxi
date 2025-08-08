import path from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import overrideConfig from './vite.config.override.js';
import localConfig from './vite.config.local.js';

// Get current directory path (client folder)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base configuration with production-optimized settings
const baseConfig = defineConfig({
  root: __dirname,
  plugins: [react()],
  
  // Set base path correctly for production
  base: './', // Changed from '/' to './'
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib')
    }
  },
  
  // Server configuration only for development
  server: process.env.NODE_ENV === 'production' ? undefined : {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Changed to localhost for development
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: true,
    
    // Key fix: Ensure proper asset naming
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      },
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
