import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Separate from vite.config.ts: Vitest bundles its own Vite, whose Plugin type
// clashes with Vite 8's. Keeping the test config here avoids the dual-type
// conflict in vite.config.ts. Tailwind isn't needed for tests (css: false).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
