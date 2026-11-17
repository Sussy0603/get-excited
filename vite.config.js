import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base = repo name, so the site works at sussy0603.github.io/get-excited/
export default defineConfig({
  plugins: [react()],
  base: '/get-excited/',
})
