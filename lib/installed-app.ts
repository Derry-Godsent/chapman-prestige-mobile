import { Platform } from "react-native";

/**
 * True when the web app is running as an installed app rather than in a browser
 * tab: added to the home screen on a phone, or installed on a desktop.
 *
 * The difference matters for the bottom of the screen. In a browser tab the
 * browser's own bars already sit below the page, so the app only needs a small
 * cushion. Installed, there is nothing below, so the phone's home indicator has to
 * be kept clear instead. Padding for both at once is what made the tab bar look
 * like it had a large empty space beneath it on a phone.
 */
export function isInstalledWebApp(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    const modes = ["(display-mode: standalone)", "(display-mode: fullscreen)", "(display-mode: minimal-ui)"];
    if (modes.some((mode) => window.matchMedia?.(mode).matches)) return true;
    // Safari on iOS reports it here rather than in a media query.
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}
