import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
        hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'http',
    },
  },

  // ============================================
  // BUILD CONFIGURATION
  // ============================================
  build: {
    // Output directory for production build
    outDir: 'dist',

    // Clean output directory before build
    emptyOutDir: true,
    
    // Source maps for debugging
    sourcemap: false, // Set to true in development
    
    // Minification
    minify: 'terser',
    
    // CSS options
    cssCodeSplit: true,
    
    // Chunk size configuration
    rollupOptions: {
      output: {
        // Split vendor code
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['recharts', 'lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['axios', 'i18next'],
        },
      },
    },
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // CommonJS options
    commonjsOptions: {
      include: [/node_modules/],
    },
  },

    // ============================================
  // OPTIMIZATION CONFIGURATION
  // ============================================
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'axios',
      'i18next',
      'react-i18next',
    ],
  },
 
  // ============================================
  // CSS CONFIGURATION
  // ============================================
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          $primary: #007bff;
          $secondary: #6c757d;
        `,
      },
    },
  },
})
