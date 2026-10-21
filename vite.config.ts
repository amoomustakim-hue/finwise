import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { devApi } from './server/dev-api.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
})
