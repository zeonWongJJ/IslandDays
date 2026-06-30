import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('/node_modules/')) {
            if (id.includes('/@react-three/')) return 'r3f';
            if (id.includes('/three/')) return 'three';
            if (id.includes('/zustand/')) return 'zustand';
          }
        },
      },
    },
  },
})
