import { Platform, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";

import { useChapmanStyles, type ChapmanPalette } from "@/components/chapman-ui";
import { PIN_LENGTH } from "@/lib/pin-policy";

/**
 * One box for a four digit PIN, on every device.
 *
 * On a phone the operating system hides the digits, which is what secureTextEntry
 * does, and the box is as it always was.
 *
 * In a browser a hidden field is a password field, and a password field brings the
 * browser's password manager with it. On an iPhone that can put a "strong
 * password" sheet in front of the box and stop the digits being typed at all,
 * which looks exactly like a broken screen. So on the web the box is an ordinary
 * numeric field whose text is invisible, with four dots drawn in its place. No
 * password manager is involved, so nothing can stand between the customer and the
 * four digits.
 */
export function PinField({
  value,
  onChangeText,
  boxStyle,
  autoFocus = false,
  accessibilityLabel = "4 digit PIN",
  returnKeyType,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (next: string) => void;
  /** The box the screen wants: its height, radius and border come from there. */
  boxStyle?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  returnKeyType?: "done" | "next";
  onSubmitEditing?: () => void;
}) {
  const { styles } = useChapmanStyles(makeStyles);
  const web = Platform.OS === "web";
  return (
    <View style={[styles.box, boxStyle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
        inputMode="numeric"
        maxLength={PIN_LENGTH}
        secureTextEntry={!web}
        autoComplete="off"
        autoCorrect={false}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        placeholder={web ? undefined : "4 digits"}
        style={styles.input}
      />
      {web ? (
        <View pointerEvents="none" style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <View key={index} style={[styles.dot, index < value.length && styles.dotFilled]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  box: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: 6,
    // Only the web box hides the digits itself; on a phone the system does it.
    color: Platform.OS === "web" ? "transparent" : palette.ink,
  },
  dots: { position: "absolute", left: 17, top: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 13 },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.soft },
  dotFilled: { backgroundColor: palette.accent, borderColor: palette.accent },
});
