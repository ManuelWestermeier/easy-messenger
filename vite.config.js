import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { minify } from "terser";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "minify-manifest-and-sw",
      enforce: "post",
      async writeBundle() {
        const docsDir = "docs";

        // Minify manifest.json
        const manifestPath = path.join(docsDir, "manifest.json");
        if (fs.existsSync(manifestPath)) {
          const manifestCode = fs.readFileSync(manifestPath, "utf8");
          fs.writeFileSync(
            manifestPath,
            JSON.stringify(JSON.parse(manifestCode)),
            "utf8"
          );
        }

        // Minify service-worker.js
        const swPath = path.join(docsDir, "service-worker.js");
        if (fs.existsSync(swPath)) {
          const swCode = fs.readFileSync(swPath, "utf8");
          const minified = await minify(swCode);
          fs.writeFileSync(swPath, minified.code, "utf8");
        }
      },
    },
  ],
  base: "/easy-messenger/",
  build: {
    outDir: "docs",
    rollupOptions: {
      input: {
        script: "index.html",
        "service-worker": "public/service-worker.js", // Include SW in the build process
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "style.css",
      },
    },
  },
  server: { port: 27562 },
  publicDir: "public",
});
