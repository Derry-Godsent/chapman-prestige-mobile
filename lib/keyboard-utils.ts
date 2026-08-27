import { Keyboard } from "react-native";

/** Dismisses an active native keyboard without changing the current screen. */
export function dismissKeyboard(): void {
  Keyboard.dismiss();
}
