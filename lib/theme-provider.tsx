import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
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

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
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
