import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/nutritionix': {
        target: 'https://trackapi.nutritionix.com/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nutritionix/, ''),
      },
      '/api/exercisedb': {
        target: 'https://api.api-ninjas.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/exercisedb/, ''),
      },
      '/api/fatsecret': {
        target: 'https://platform.fatsecret.com/rest/server.api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fatsecret/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
