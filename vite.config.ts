import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match your GitHub Pages repo name exactly, e.g. '/ArtikleJar/'
// Update this if your repo is named differently before deploying.
export default defineConfig({
  plugins: [react()],
  base: '/ArtikleJar/',
})
