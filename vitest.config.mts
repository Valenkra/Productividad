import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node", // los tests de UI declaran `// @vitest-environment jsdom`
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // Solo "pegamento" sin lógica: layouts/páginas que delegan, tipos y tipados de Next.
      exclude: ["src/app/**/layout.tsx", "src/app/**/page.tsx", "src/**/types.ts"],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 85 },
    },
  },
});
