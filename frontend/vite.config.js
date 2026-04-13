import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://10.12.148.16:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://10.12.148.16:5001',
        changeOrigin: true,
      },
    },
  },
});
