import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy notes:
 * Your backend routes are:
 *   /            (root)
 *   /health
 *   /datasets/*
 *   /models/*
 *   /admin/*
 *
 * In development, this proxy lets the frontend call those paths directly
 * without CORS headaches (same-origin).
 *
 * If you set VITE_BACKEND_URL, it will proxy to that target.
 * Example: VITE_BACKEND_URL=http://127.0.0.1:8000
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_BACKEND_URL || "http://localhost:8000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // Proxy backend API paths (keep in sync with backend)
        "/health": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        "/datasets": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        "/models": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        "/admin": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        // Optional: if your app hits backend root "/" directly in dev
        // (Not recommended if you use client-side routing at "/")
        // "/": { target: backendTarget, changeOrigin: true, secure: false },
      },
    },
    preview: {
      port: 5173,
      strictPort: true,
    },
  };
});
