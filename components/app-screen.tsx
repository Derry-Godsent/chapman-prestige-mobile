import { ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { useChapmanPalette } from "@/components/chapman-ui";
import { darkPalette } from "@/lib/theme-palette";
import { KeyboardDismissBoundary } from "@/components/keyboard-dismiss-boundary";
export function AppScreen({ children, dark = false, edges }: { children: ReactNode; dark?: boolean; edges?: ("top" | "bottom" | "left" | "right")[] }) {
  const palette = useChapmanPalette();
  // The phone's clock and battery follow the skin, not just the screen. On the
  // dark skin the icons have to be light, or they vanish into the background.
  const darkBackground = dark || palette.canvas === darkPalette.canvas;
  return (
    <KeyboardDismissBoundary>
      <ScreenContainer edges={edges} containerClassName={dark ? "bg-[#1C1208]" : "bg-background"} className="flex-1">
        <StatusBar style={darkBackground ? "light" : "dark"} backgroundColor={dark ? palette.deep : palette.canvas} />
        {children}
      </ScreenContainer>
    </KeyboardDismissBoundary>
  );
}
