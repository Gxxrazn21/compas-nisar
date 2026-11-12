/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El backend corre en 127.0.0.1:8000. COMPAS_API permite apuntar a otra instancia
// (por ejemplo, una copia de desarrollo en otro puerto) sin tocar este archivo.
const backend = process.env.COMPAS_API ?? 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  build: {
    // MapLibre GL pesa cerca de 1 MB minificado por sí sola: va en su propio chunk (se cachea aparte
    // y no retrasa el resto de la app) y el límite del aviso se sube a su tamaño real.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': backend,
      '/derived': backend,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
