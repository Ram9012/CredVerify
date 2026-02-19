import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
    react(),
  ],
  server: {
    host: true,   // Binds to 0.0.0.0 → accessible as http://<your-local-IP>:5174
    port: 5174,   // Fixed port so QR URLs stay consistent
  },
})

