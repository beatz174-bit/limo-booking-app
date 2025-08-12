import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_ASSET_BASE || '/',
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup/setupTests.ts",
    css: true,
    globals: true,
    coverage: {
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
});