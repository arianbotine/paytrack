import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/shared/components"),
      "@hooks": resolve(__dirname, "./src/shared/hooks"),
      "@lib": resolve(__dirname, "./src/lib"),
      "@features": resolve(__dirname, "./src/features"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
