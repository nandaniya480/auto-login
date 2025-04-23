import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'public/popup.html'),
                settings: resolve(__dirname, 'public/settings.html')
            },
            output: {
                entryFileNames: `assets/[name].js`
            }
        },
        outDir: 'dist'
    }
})
