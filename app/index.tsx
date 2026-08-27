import { Redirect } from "expo-router";

/**
 * Expo Go opens the project at the root URL. Keep this route explicit so a
 * fresh launch always starts with the branded splash rather than restoring a
 * tab route as the first visible screen.
 */
export default function RootEntry() {
  return <Redirect href="/splash" />;
}
