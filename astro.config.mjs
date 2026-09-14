import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  vite: {
    server: {
      proxy: {
        '/api/v1': {
          target: 'https://budget.rtreertree.com',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  },
});