import { describe, expect, it } from "vitest";

describe("Chapman Supabase mobile credentials", () => {
  it("can access the project auth settings endpoint with the configured publishable key", async () => {
    const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(projectUrl, "EXPO_PUBLIC_SUPABASE_URL must be configured").toBeTruthy();
    expect(publishableKey, "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured").toBeTruthy();

    const response = await fetch(`${projectUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey! },
    });

    expect(response.status, `Supabase auth settings endpoint returned ${response.status}`).toBe(200);
  });
});
