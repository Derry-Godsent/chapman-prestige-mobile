import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { View, useColorScheme as useSystemColorScheme } from "react-native";
import { vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

/** What the customer chose: a fixed skin, or whatever their phone is set to. */
export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  /** The skin actually in use right now. */
  colorScheme: ColorScheme;
  /** What the customer asked for, which may be "follow my phone". */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Kept for the screens that only offer light or dark. */
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "chapman-prestige-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = (useSystemColorScheme() ?? "light") as ColorScheme;
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  // A fixed choice wins. "system" follows the phone, and changes with it.
  const colorScheme: ColorScheme = preference === "system" ? systemScheme : preference;

  /**
   * Switches the skin by redrawing with the other palette, and asks nothing of
   * the operating system. That last part is the whole point of this comment.
   *
   * This used to call Appearance.setColorScheme, and nativewind's own setter,
   * which calls the same thing underneath. Both of those tell the PHONE to change
   * its appearance. That makes the whole app draw a second time, and on Android it
   * asks the system for a configuration change, so one tap on the switch cost two
   * full redraws and a round trip to the operating system before the new colours
   * appeared. That is exactly why the switch felt slow.
   *
   * It is not needed. Every screen reads its colours from the palette in
   * lib/theme-palette.ts, through useChapmanPalette and useChapmanStyles, so the
   * app repaints as soon as the choice changes. The phone's own appearance is left
   * alone, which also means a customer who chooses dark in the app does not change
   * anything else on their phone.
   *
   * A browser is the one place that needs a little work, because the few screens
   * that use Tailwind classes read their colours from CSS variables, so those
   * variables are rewritten here. On a phone there is nothing to do at all.
   */
  const applyScheme = useCallback((scheme: ColorScheme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = scheme;
    root.classList.toggle("dark", scheme === "dark");
    const palette = SchemeColors[scheme];
    Object.entries(palette).forEach(([token, value]) => {
      root.style.setProperty(`--color-${token}`, value);
    });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => setPreference(scheme), [setPreference]);

  // Remember the customer's choice, including "follow my phone".
  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") setPreferenceState(stored);
    });
  }, []);

  useEffect(() => { applyScheme(colorScheme); }, [applyScheme, colorScheme]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      preference,
      setPreference,
      setColorScheme,
    }),
    [colorScheme, preference, setPreference, setColorScheme],
  );
  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

/**
 * The skin in use right now, without insisting on a provider.
 *
 * Screens use this to pick their colours, so a component that happens to be
 * rendered on its own still draws correctly rather than crashing.
 */
export function useColorSchemeSafe(): ColorScheme {
  const ctx = useContext(ThemeContext);
  const systemScheme = (useSystemColorScheme() ?? "light") as ColorScheme;
  return ctx?.colorScheme ?? systemScheme;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
