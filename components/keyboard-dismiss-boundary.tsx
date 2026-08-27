import { type ReactNode } from "react";

interface KeyboardDismissBoundaryProps {
  children: ReactNode;
}

/**
 * Intentionally does not register as a touch responder. The previous global
 * touchable wrapper could win the responder negotiation ahead of nested
 * ScrollViews in Expo Go, leaving taps usable but blocking vertical swipes.
 * Screens that contain inputs already use their own keyboard-safe scroll
 * settings, so scroll movement always takes priority.
 */
export function KeyboardDismissBoundary({ children }: KeyboardDismissBoundaryProps) {
  return <>{children}</>;
}
