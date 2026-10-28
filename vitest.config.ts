import { defineConfig } from 'vitest/config';

// Configuração separada para os testes não subirem o plugin do Cloudflare.
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });
