/**
 * The app's colours, in two skins.
 *
 * Every screen draws from these names rather than fixed colours, so switching to
 * the dark skin changes the whole app rather than a corner of it. The light
 * values are the ones the app has always used, so nothing looks different until
 * dark is chosen.
 *
 * The rule for the dark skin: keep the brand green for filled buttons and cards,
 * because white text sits on those, and use the brighter "accent" for green text
 * and icons sitting on a dark surface, where the deeper green would be hard to
 * read.
 */

export type ChapmanPalette = {
  /** Filled buttons, the green bonus card, and the tab bar's active colour. */
  blue: string;
  electric: string;
  /** Green used for text and icons on a surface. Brighter in the dark skin. */
  accent: string;
  /** The brand's deep brown. Used for gradients and photo holders, never text. */
  deep: string;
  /** Large headings. */
  title: string;
  orange: string;
  secondaryOrange: string;
  canvas: string;
  surface: string;
  /** A slightly lifted surface, for rows inside a card. */
  soft: string;
  chip: string;
  chipBlue: string;
  chipOrange: string;
  chipGreen: string;
  chipRed: string;
  ink: string;
  muted: string;
  placeholder: string;
  border: string;
  divider: string;
  paleBlue: string;
  green: string;
  error: string;
  eyebrow: string;
  accentBorder: string;
  /** Text that sits on a filled brand colour, so it stays light in both skins. */
  onAccent: string;
};

export const lightPalette: ChapmanPalette = {
  blue: "#059669",
  electric: "#10B981",
  accent: "#059669",
  deep: "#1C1208",
  title: "#1C1208",
  orange: "#F59E0B",
  secondaryOrange: "#92400E",
  canvas: "#FAF6EE",
  surface: "#FFFFFF",
  soft: "#F2FAF3",
  chip: "#E4F4E9",
  chipBlue: "#EEF3FF",
  chipOrange: "#FFF1CC",
  chipGreen: "#DCFCE7",
  chipRed: "#FDEBEB",
  ink: "#4B3E30",
  muted: "#7A6A59",
  placeholder: "#9AA1AE",
  border: "#DED4C6",
  divider: "#EEE9E0",
  paleBlue: "#E4F4E9",
  green: "#047857",
  error: "#BA1A1A",
  eyebrow: "#5871B5",
  accentBorder: "#A7D8C4",
  onAccent: "#FFFFFF",
};

export const darkPalette: ChapmanPalette = {
  blue: "#059669",
  electric: "#10B981",
  accent: "#34D399",
  deep: "#111318",
  title: "#F2F4F7",
  orange: "#F59E0B",
  secondaryOrange: "#F5B855",
  // A cool near-black rather than the earlier brown, which turned every screen
  // the same shade. Cards lift slightly above the background so the layering is
  // still readable, and the hairlines sit just above the card, never a light
  // line across a dark screen.
  canvas: "#111318",
  surface: "#1A1D23",
  soft: "#20242B",
  chip: "#17302A",
  chipBlue: "#1B2533",
  chipOrange: "#33270F",
  chipGreen: "#14301F",
  chipRed: "#36201F",
  ink: "#EDEFF3",
  muted: "#9BA3AE",
  placeholder: "#7C848F",
  border: "#2B3038",
  divider: "#242830",
  paleBlue: "#1B2533",
  green: "#34D399",
  error: "#F87171",
  eyebrow: "#8FC7A6",
  accentBorder: "#2F6B52",
  onAccent: "#FFFFFF",
};

export const chapmanPalettes = { light: lightPalette, dark: darkPalette } as const;

export function paletteFor(scheme: "light" | "dark"): ChapmanPalette {
  return chapmanPalettes[scheme] ?? lightPalette;
}
