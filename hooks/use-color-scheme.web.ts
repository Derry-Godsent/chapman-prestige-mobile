import { useEffect, useState } from "react";

import { useColorSchemeSafe } from "@/lib/theme-provider";

/**
 * The skin in use, on the web, for the few older components that read a colour
 * palette directly.
 *
 * It used to ask the browser what the visitor's computer was set to, which meant
 * those components ignored the choice made in Settings. It now follows the same
 * choice as everything else. The first pass of a static render still answers
 * "light", so the built markup is stable, and the real answer follows straight
 * after the page has loaded.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useColorSchemeSafe();

  if (hasHydrated) {
    return colorScheme;
  }

  return "light";
}
