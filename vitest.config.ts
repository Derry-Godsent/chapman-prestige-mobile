import { defineConfig } from "vitest/config";

/**
 * Vitest runs the pure-logic layer in a Node environment.
 *
 * Deliberately narrow: these tests cover pricing, request contracts, and
 * formatting helpers. Anything that needs React Native, Expo, or a live
 * Supabase connection is exercised on a device, not here.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Loads .env so tests can read EXPO_PUBLIC_* values without the shell
    // having to export them first.
    setupFiles: ["./tests/setup-env.ts"],
  },
});
