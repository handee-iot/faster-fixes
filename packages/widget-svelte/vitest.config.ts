import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// The Svelte plugin compiles the tests' .svelte components only; the published
// source stays compiler-free.
export default defineConfig({
  plugins: [svelte()],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
    passWithNoTests: true,
  },
});
