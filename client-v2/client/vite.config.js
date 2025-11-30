import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Questo espone su 0.0.0.0 (tutti gli IP)
    port: 5173,
  }
})