import { describe, expect, it } from "vitest";

import { chapmanPalettes, darkPalette, lightPalette, paletteFor } from "../lib/theme-palette";

/** How bright a colour is, near enough for judging a dark skin. */
function brightness(hex: string): number {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000;
}

describe("the two app skins", () => {
  it("gives both skins every colour the screens ask for", () => {
    expect(Object.keys(darkPalette).sort()).toEqual(Object.keys(lightPalette).sort());
  });

  it("makes the dark skin genuinely dark, from background to card", () => {
    expect(brightness(darkPalette.canvas)).toBeLessThan(40);
    expect(brightness(darkPalette.surface)).toBeLessThan(60);
    // A card sits above the background, so it is lighter than it but still dark.
    expect(brightness(darkPalette.surface)).toBeGreaterThan(brightness(darkPalette.canvas));
    expect(brightness(darkPalette.border)).toBeLessThan(90);
  });

  it("keeps the light skin light while making the dark skin's text readable", () => {
    expect(brightness(lightPalette.surface)).toBeGreaterThan(240);
    expect(brightness(lightPalette.ink)).toBeLessThan(120);
    expect(brightness(darkPalette.ink)).toBeGreaterThan(200);
    expect(brightness(darkPalette.muted)).toBeGreaterThan(120);
  });

  it("keeps filled brand colours and the text on them unchanged, so white text still reads", () => {
    expect(darkPalette.blue).toBe(lightPalette.blue);
    expect(darkPalette.onAccent).toBe("#FFFFFF");
    expect(lightPalette.onAccent).toBe("#FFFFFF");
  });

  it("brightens the accent in the dark skin, where the deeper green would be hard to read", () => {
    expect(brightness(darkPalette.accent)).toBeGreaterThan(brightness(lightPalette.accent));
  });

  it("answers with the skin that was asked for, and never nothing", () => {
    expect(paletteFor("dark")).toBe(chapmanPalettes.dark);
    expect(paletteFor("light")).toBe(chapmanPalettes.light);
  });
});
