import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "easy-messenger",
  build: {
    outDir: "docs",
    rollupOptions: {
      output: {
        entryFileNames: "script.js", // Force JS output as script.js
        assetFileNames: "style.css", // Force CSS output as style.css
      },
    },
  },
  server: { port: 27562 },
});
