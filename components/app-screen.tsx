import { ReactNode } from "react";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { palette } from "@/components/chapman-ui";

export function AppScreen({ children, dark = false, edges }: { children: ReactNode; dark?: boolean; edges?: ("top" | "bottom" | "left" | "right")[] }) {
  return (
    <ScreenContainer edges={edges} containerClassName={dark ? "bg-[#001452]" : "bg-background"} className="flex-1">
      <StatusBar style={dark ? "light" : "dark"} backgroundColor={dark ? palette.deep : palette.canvas} />
      {children}
    </ScreenContainer>
  );
}
