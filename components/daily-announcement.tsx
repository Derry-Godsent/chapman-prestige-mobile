import { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { palette } from "@/components/chapman-ui";

const STORAGE_KEY = "chapman-daily-announcement-date";
const todayKey = () => new Date().toISOString().slice(0, 10);

export function DailyAnnouncement({ onOpen }: { onOpen: () => void }) {
  const [visible, setVisible] = useState(false);
  const announcement = useMemo(() => {
    const month = new Date().getMonth();
    if (month === 0) return { type: "NEW YEAR MESSAGE", title: "A fresh year for better spaces.", text: "Plan the care that keeps home, work, and water routines ready for the year ahead.", icon: "sparkles-outline" as const };
    if (month === 11) return { type: "HOLIDAY ANNOUNCEMENT", title: "Make room for the moments that matter.", text: "Book early for laundry, deep cleaning, and guest-ready care during the festive period.", icon: "gift-outline" as const };
    return { type: "CHAPMAN NEWS", title: "Your preferred service date now comes first.", text: "Request a day that suits you, then accept or reject the confirmed appointment before service begins.", icon: "calendar-outline" as const };
  }, []);

  useEffect(() => { void AsyncStorage.getItem(STORAGE_KEY).then((stored) => setVisible(stored !== todayKey())); }, []);
  const dismiss = () => { setVisible(false); void AsyncStorage.setItem(STORAGE_KEY, todayKey()); };
  const open = () => { dismiss(); onOpen(); };

  return <Modal transparent visible={visible} animationType="fade" onRequestClose={dismiss}><View style={styles.backdrop}><View style={styles.card}><TouchableOpacity onPress={dismiss} style={styles.close}><Ionicons name="close" size={20} color="#657086" /></TouchableOpacity><View style={styles.icon}><Ionicons name={announcement.icon} size={26} color="#FFFFFF" /></View><Text style={styles.type}>{announcement.type}</Text><Text style={styles.title}>{announcement.title}</Text><Text style={styles.text}>{announcement.text}</Text><TouchableOpacity onPress={open} style={styles.action}><Text style={styles.actionText}>View updates</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></TouchableOpacity><TouchableOpacity onPress={dismiss} style={styles.secondary}><Text style={styles.secondaryText}>Not now</Text></TouchableOpacity></View></View></Modal>;
}

const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0, 18, 62, 0.45)" }, card: { borderRadius: 25, backgroundColor: "#FFFFFF", padding: 23, alignItems: "center" }, close: { position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F4F8" }, icon: { width: 58, height: 58, borderRadius: 20, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center", marginTop: 5 }, type: { color: palette.orange, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15, marginTop: 15 }, title: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 22, lineHeight: 29, textAlign: "center", marginTop: 6 }, text: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8, maxWidth: 280 }, action: { width: "100%", minHeight: 48, borderRadius: 15, marginTop: 21, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 }, actionText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 13 }, secondary: { minHeight: 35, marginTop: 7, justifyContent: "center" }, secondaryText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 12 } });
