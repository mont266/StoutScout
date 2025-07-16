import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    // Explicitly tell the React plugin to handle JSX syntax in .js files.
    // By default, it only processes .jsx and .tsx files.
    include: "**/*.{jsx,tsx,js,ts}",
  })],
})