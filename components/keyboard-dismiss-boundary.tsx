import { type ReactNode } from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";

import { dismissKeyboard } from "@/lib/keyboard-utils";

interface KeyboardDismissBoundaryProps {
  children: ReactNode;
}

/**
 * Lets any current or future Chapman screen close the keyboard with a tap
 * outside the active input, while preserving normal input focus and controls.
 */
export function KeyboardDismissBoundary({ children }: KeyboardDismissBoundaryProps) {
  return (
    <TouchableWithoutFeedback accessible={false} onPress={dismissKeyboard}>
      <View style={styles.fill}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
