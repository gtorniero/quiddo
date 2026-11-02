import { defineConfig } from 'vite';
import { prerender } from './scripts/prerender';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [cloudflare(), prerender()],
  build: { target: 'es2017' },
});
