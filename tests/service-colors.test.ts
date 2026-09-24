import { describe, expect, it } from "vitest";

import { serviceColor, serviceColorIds } from "../lib/service-colors";

// The eight services the app shows, named here rather than imported, so this
// test stays pure and never drags the phone's own libraries into Node.
const SERVICE_IDS = ["laundry", "cleaning", "fumigation", "detailing", "fabric", "polytank", "contract", "workers"];
import { builtInDailyMessages, dailyMessageLabel, MORNINGS_AHEAD } from "../lib/daily-messages";

/** How bright a colour is, near enough for judging a dark screen. */
function brightness(hex: string): number {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000;
}

describe("a colour for each service", () => {
  it("gives every service in the app its own colour", () => {
    for (const id of SERVICE_IDS) {
      expect(serviceColorIds, `${id} has no colour`).toContain(id);
    }
  });

  it("keeps the services told apart, rather than one shared green", () => {
    const light = serviceColorIds.map((id) => serviceColor(id, "light").accent);
    expect(new Set(light).size).toBe(light.length);
  });

  it("brightens every service colour for the dark skin, so none disappears", () => {
    for (const id of serviceColorIds) {
      const light = serviceColor(id, "light");
      const dark = serviceColor(id, "dark");
      expect(brightness(dark.accent), `${id} accent is too dim on dark`).toBeGreaterThan(brightness(light.accent));
      expect(brightness(dark.wash), `${id} wash is too bright on dark`).toBeLessThan(90);
    }
  });

  it("uses a colour that reads on the dark skin for every service", () => {
    for (const id of serviceColorIds) {
      expect(brightness(serviceColor(id, "dark").accent), `${id} would be hard to read`).toBeGreaterThan(120);
    }
  });

  it("falls back to the brand colour for anything it does not know", () => {
    const unknown = serviceColor("something-new", "dark");
    expect(unknown.accent).toBe("#34D399");
  });
});

describe("the morning messages", () => {
  it("carries a message for every morning of the week", () => {
    expect(builtInDailyMessages).toHaveLength(MORNINGS_AHEAD);
    for (const message of builtInDailyMessages) {
      expect(message.title.trim()).not.toBe("");
      expect(message.body.trim()).not.toBe("");
    }
  });

  it("names each kind of message in plain words", () => {
    expect(dailyMessageLabel("tip")).toBe("Care tip");
    expect(dailyMessageLabel("holiday")).toBe("Holiday notice");
    expect(dailyMessageLabel("announcement")).toBe("Announcement");
    expect(dailyMessageLabel("thanks")).toBe("Thank you");
    expect(dailyMessageLabel("anything-else")).toBe("Chapman news");
  });
});
