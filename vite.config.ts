import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // When deploying to GitHub Pages set env GH_PAGES_BASE to "/<repo>/" (include leading & trailing slash)
  base: process.env.GH_PAGES_BASE || '/',
  server: {
    host: "::",
    port: 8080,
    // Proxy API requests to the backend during dev
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
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
}));
