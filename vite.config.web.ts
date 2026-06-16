import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build de la version web / PWA (navigateur, iPhone). Réutilise le code React
// du renderer ; la couche données passe par `src/web/webApi.ts` (IndexedDB).
export default defineConfig({
  root: 'src/web',
  base: './',
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer'),
    },
  },
  plugins: [react()],
  build: {
    outDir: resolve('dist-web'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 6000,
  },
})
