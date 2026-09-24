import { ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { useChapmanPalette } from "@/components/chapman-ui";
import { KeyboardDismissBoundary } from "@/components/keyboard-dismiss-boundary";
export function AppScreen({ children, dark = false, edges }: { children: ReactNode; dark?: boolean; edges?: ("top" | "bottom" | "left" | "right")[] }) {
  const palette = useChapmanPalette();
  return (
    <KeyboardDismissBoundary>
      <ScreenContainer edges={edges} containerClassName={dark ? "bg-[#1C1208]" : "bg-background"} className="flex-1">
        <StatusBar style={dark ? "light" : "dark"} backgroundColor={dark ? palette.deep : palette.canvas} />
        {children}
      </ScreenContainer>
    </KeyboardDismissBoundary>
  );
}
