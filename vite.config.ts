import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the committed dist/ works from any static host or file://
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
