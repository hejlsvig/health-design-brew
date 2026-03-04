import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Plugin to serve CRM static files from the Keto_Calculator_Project/crm directory
function serveCrmPlugin() {
  const crmDir = path.resolve(__dirname, '../Keto_Calculator_Project/crm')
  const translationsDir = path.resolve(__dirname, '../Keto_Calculator_Project/translations')

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  }

  function serveStatic(baseDir: string, urlPrefix: string, req: any, res: any): boolean {
    if (req.url && req.url.startsWith(urlPrefix)) {
      // Strip query parameters before resolving file path
      const urlPath = req.url.split('?')[0]
      const filePath = path.join(baseDir, urlPath.replace(urlPrefix, ''))
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase()
        const contentType = mimeTypes[ext] || 'application/octet-stream'
        res.setHeader('Content-Type', contentType)
        fs.createReadStream(filePath).pipe(res)
        return true
      }
    }
    return false
  }

  return {
    name: 'serve-crm',
    configureServer(server: any) {
      // This middleware runs BEFORE Vite's SPA fallback
      server.middlewares.use((req: any, res: any, next: any) => {
        if (serveStatic(crmDir, '/crm/', req, res)) return
        if (serveStatic(translationsDir, '/translations/', req, res)) return
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    serveCrmPlugin(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-image', '@tiptap/extension-link'],
        },
      },
    },
    // Increase threshold since we now have proper chunking
    chunkSizeWarningLimit: 600,
    // Enable source maps for error tracking
    sourcemap: true,
  },
})
