import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// Yolları dosyanın kendi konumuna göre çözüyoruz; böylece vite hangi
// dizinden çağrılırsa çağrılsın giriş noktaları doğru bulunur.
const at = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        daily: at('./index.html'),
        love: at('./love.html'),
        business: at('./business.html'),
      },
    },
  },
  server: { port: 5173, open: true },
})
