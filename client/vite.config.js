import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js', // Ensure it's linking your PostCSS file
  },
  define: {
    'process.env': {},  // Polyfill for process.env in the browser environment
  },
  optimizeDeps: {
    include: ['process'],  // Include process in dependencies optimization
  },
});
