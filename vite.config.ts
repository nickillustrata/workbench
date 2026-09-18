import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the committed build works from any static host or file://.
// Output goes to docs/ because GitHub Pages (legacy build) can only serve
// the repo root or /docs — Pages is configured for main:/docs.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'docs' },
})
