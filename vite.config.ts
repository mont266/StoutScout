
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true // This exposes the server to the network
  },
  optimizeDeps: {
    include: ['react-router-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['tests/**/*.test.{js,ts,jsx,tsx}'], // Explicitly include the new tests folder
  },
})