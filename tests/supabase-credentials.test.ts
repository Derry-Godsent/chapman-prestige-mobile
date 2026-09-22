import { describe, expect, it } from "vitest";

/**
 * Guards the two values the app cannot work without.
 *
 * The configuration check always runs. The live network check is opt-in via
 * `CHAPMAN_LIVE_TESTS=1` (`pnpm test:live`) because it needs outbound access to
 * the Supabase project, which is not available in every environment.
 */
describe("Chapman Supabase mobile credentials", () => {
  it("has a project URL and publishable key configured", () => {
    const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(projectUrl, "EXPO_PUBLIC_SUPABASE_URL must be configured").toBeTruthy();
    expect(publishableKey, "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured").toBeTruthy();

    expect(projectUrl, "EXPO_PUBLIC_SUPABASE_URL must be a Supabase project URL").toMatch(
      /^https:\/\/[a-z0-9]+\.supabase\.co$/,
    );
    expect(publishableKey, "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable key").toMatch(
      /^sb_publishable_/,
    );
    expect(publishableKey, "a service-role key must never be shipped in the app").not.toMatch(/service_role/);
  });

  it.skipIf(process.env.CHAPMAN_LIVE_TESTS !== "1")(
    "reaches the project auth settings endpoint with the configured publishable key",
    async () => {
      const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

      const response = await fetch(`${projectUrl}/auth/v1/settings`, {
        headers: { apikey: publishableKey },
      });

      expect(response.status, `Supabase auth settings endpoint returned ${response.status}`).toBe(200);
    },
  );
});
