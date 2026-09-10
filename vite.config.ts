import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Subpath is the locked destination in PROJECT_OUTLINE.md §7.3.
// Override with VITE_BASE=/ for a root deploy.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/projects/grep-vs-embeddings/',
})
