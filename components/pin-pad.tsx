import { useCallback, useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useChapmanStyles, type ChapmanPalette } from "@/components/chapman-ui";
import { PIN_LENGTH, pinKeyFromKeyboard } from "@/lib/pin-policy";
import { haptic } from "@/lib/haptics";

/** The keys, in order, with one empty space where a thumb rests. */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/**
 * The four digit PIN pad, used everywhere a PIN is asked for: opening the app,
 * and choosing one after signing in.
 *
 * There is one pad rather than one per screen, because a PIN pad is the one thing
 * in this app that has to behave identically everywhere. Nothing to type into
 * means nothing for a browser or an operating system to stand in front of: no
 * keyboard to open, no password manager to interrupt, no field to focus. Big keys
 * work the same on an iPhone, an Android phone, a laptop and in Expo Go.
 *
 * On a computer the digits can also be typed, because that is what a person at a
 * keyboard expects to do.
 */
export function PinPad({
  value,
  onChange,
  disabled = false,
  dots = true,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  dots?: boolean;
}) {
  const { styles, palette } = useChapmanStyles(makeStyles);

  const press = useCallback((key: string) => {
    if (disabled) return;
    haptic.light();
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= PIN_LENGTH) return;
    onChange(value + key);
  }, [disabled, onChange, value]);

  // The listener is attached once, so it reads the latest press through a ref
  // rather than being re-attached on every digit.
  const pressRef = useRef(press);
  useEffect(() => { pressRef.current = press; }, [press]);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = pinKeyFromKeyboard(event.key);
      if (!key) return;
      event.preventDefault();
      pressRef.current(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <View style={styles.wrap}>
      {dots ? (
        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <View key={index} style={[styles.dot, index < value.length && styles.dotFilled]} />
          ))}
        </View>
      ) : null}
      <View style={styles.keypad}>
        {KEYS.map((key, index) => {
          if (key === "") return <View key={`gap-${index}`} style={styles.key} />;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => press(key)}
              activeOpacity={0.7}
              accessibilityLabel={key === "back" ? "Delete" : key}
              style={[styles.key, disabled && styles.keyOff]}
            >
              {key === "back" ? (
                <Ionicons name="backspace-outline" size={23} color={palette.ink} />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  wrap: { alignItems: "center", gap: 22 },
  dots: { flexDirection: "row", gap: 14 },
  dot: { width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: "#C9BFB0", backgroundColor: palette.surface },
  dotFilled: { backgroundColor: palette.blue, borderColor: palette.blue },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 },
  key: { width: 76, height: 60, borderRadius: 19, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  keyOff: { opacity: 0.5 },
  keyText: { color: palette.ink, fontFamily: "PlusJakartaSans_700Bold", fontSize: 23 },
});
