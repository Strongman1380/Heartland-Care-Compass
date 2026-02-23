import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine the base URL based on deployment target
  // GitHub Pages: GH_PAGES_BASE, Vercel: '/', or custom: VITE_BASE_URL
  const base = process.env.GH_PAGES_BASE || process.env.VITE_BASE_URL || '/';
  
  // Determine API URL for production builds
  const apiBaseUrl = process.env.VITE_API_BASE_URL || '/api';
  
  return {
    base,
    define: {
      // Make environment variables available to the client
      'process.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
    server: {
      host: "::",
      port: 8080,
      // Proxy API requests to Firebase emulator during dev
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001/heartland-boys-home-data/us-central1/api',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Optimize build
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react', 
              'react-dom', 
              'react-router-dom'
            ],
            ui: [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
            ],
          }
        }
      }
    }
  };
});
