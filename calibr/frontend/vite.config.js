// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,   // matches the CORS origin in FastAPI main.py
    // Proxy API calls in dev so the browser never sees CORS issues
    proxy: {
      "/api": {
        target     : "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
