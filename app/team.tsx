import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, PrimaryButton, SectionHeading, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { APP_IDEA_KINDS, AppIdeaKind, sendAppIdea } from "@/lib/app-ideas";
import { CHAPMAN_TEAM, ChapmanTeamMember, teamInitials } from "@/lib/chapman-team";
import { useCustomerAccount } from "@/hooks/use-customer-account";

/**
 * The people who do the work, and the place to tell Chapman what to build next.
 *
 * The bubbles are the team. Tapping one opens that person underneath, with the
 * short version of what they do. The form at the bottom sends an idea straight
 * to Chapman's own records.
 */

function PersonBubble({ member, open, onPress }: { member: ChapmanTeamMember; open: boolean; onPress: () => void }) {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const pop = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(pop, { toValue: open ? 1 : 0, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [open, pop]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.bubbleColumn} accessibilityLabel={`${member.name}, ${member.role}. Tap for more.`}>
      <Animated.View style={[styles.bubble, open && styles.bubbleOpen, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
        <Text style={[styles.bubbleInitials, open && styles.bubbleInitialsOpen]}>{teamInitials(member)}</Text>
      </Animated.View>
      <Text style={styles.bubbleName} numberOfLines={2}>{member.name}</Text>
      <Text style={styles.bubbleRole} numberOfLines={2}>{member.role}</Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={13} color={palette.muted} />
    </TouchableOpacity>
  );
}

function PersonDetail({ member, onClose }: { member: ChapmanTeamMember; onClose: () => void }) {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const open = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    open.setValue(0);
    const animation = Animated.timing(open, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [member.id, open]);

  return (
    <Animated.View
      style={[
        styles.detailCard,
        { opacity: open, transform: [{ translateY: open.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      <View style={styles.detailTop}>
        <View style={styles.detailAvatar}><Text style={styles.detailInitials}>{teamInitials(member)}</Text></View>
        <View style={styles.detailTopCopy}>
          <Text style={styles.detailName}>{member.name}</Text>
          <Text style={styles.detailRole}>{member.role}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.detailClose} accessibilityLabel="Close this person"><Ionicons name="close" size={18} color={palette.muted} /></TouchableOpacity>
      </View>
      <BodyText style={styles.detailBio}>{member.bio}</BodyText>
      {member.email ? (
        <View style={styles.detailLine}><Ionicons name="mail-outline" size={15} color={palette.accent} /><Text style={styles.detailLineText} selectable>{member.email}</Text></View>
      ) : null}
      {member.phone ? (
        <View style={styles.detailLine}><Ionicons name="call-outline" size={15} color={palette.accent} /><Text style={styles.detailLineText} selectable>{member.phone}</Text></View>
      ) : null}
      {!member.email && !member.phone ? (
        <Text style={styles.detailNote}>Reach this person through the Chapman office, or mention their name in a booking note.</Text>
      ) : null}
    </Animated.View>
  );
}

export default function TeamScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const { account } = useCustomerAccount();
  const [openId, setOpenId] = useState<string | null>(null);
  const [kind, setKind] = useState<AppIdeaKind>("add");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const openMember = CHAPMAN_TEAM.find((member) => member.id === openId) ?? null;
  const leadership = CHAPMAN_TEAM.filter((member) => member.group === "leadership");
  const site = CHAPMAN_TEAM.filter((member) => member.group === "site");

  const submit = async () => {
    setBusy(true);
    setNotice(null);
    setFailed(false);
    const result = await sendAppIdea({
      kind,
      idea,
      authorName: account?.full_name ?? null,
      phone: account?.phone ?? null,
    });
    setNotice(result.message);
    setFailed(!result.sent);
    if (result.sent) setIdea("");
    setBusy(false);
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="The Chapman team" subtitle="The people who do the work, from the founder to the crews" />

          <Text style={styles.intro}>Every name below is a real person at Chapman Prestige Limited. Tap a bubble to read what they do.</Text>

          <SectionHeading title="Leadership" />
          <View style={styles.bubbleGrid}>
            {leadership.map((member) => (
              <PersonBubble key={member.id} member={member} open={openId === member.id} onPress={() => setOpenId(openId === member.id ? null : member.id)} />
            ))}
          </View>

          <SectionHeading title="On site and in the workshop" />
          <View style={styles.bubbleGrid}>
            {site.map((member) => (
              <PersonBubble key={member.id} member={member} open={openId === member.id} onPress={() => setOpenId(openId === member.id ? null : member.id)} />
            ))}
          </View>

          {openMember ? <PersonDetail member={openMember} onClose={() => setOpenId(null)} /> : null}

          <SectionHeading title="Tell Chapman what to build next" />
          <View style={styles.ideaCard}>
            <Text style={styles.ideaText}>Something the app should add, remove, or change? Write it here. Chapman reads every one.</Text>
            <View style={styles.kindRow}>
              {APP_IDEA_KINDS.map((option) => (
                <TouchableOpacity key={option.value} onPress={() => setKind(option.value)} style={[styles.kindPill, kind === option.value && styles.kindPillOn]} accessibilityLabel={option.label}>
                  <Text style={[styles.kindText, kind === option.value && styles.kindTextOn]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.kindHint}>{APP_IDEA_KINDS.find((option) => option.value === kind)?.hint}</Text>
            <TextInput
              value={idea}
              onChangeText={setIdea}
              placeholder="For example: let me repeat last week's laundry order in one tap."
              placeholderTextColor={palette.placeholder}
              style={styles.ideaInput}
              multiline
              maxLength={1500}
              editable={!busy}
            />
            {notice ? (
              <View style={[styles.notice, failed && styles.noticeBad]}>
                <Ionicons name={failed ? "alert-circle-outline" : "checkmark-circle-outline"} size={16} color={failed ? palette.error : palette.green} />
                <Text style={[styles.noticeText, failed && styles.noticeTextBad]}>{notice}</Text>
              </View>
            ) : null}
            {!account ? (
              <View style={styles.signInNote}>
                <Text style={styles.signInNoteText}>Sign in with your phone so Chapman can reply to your idea.</Text>
                <TouchableOpacity onPress={() => router.push("/auth/phone" as never)} style={styles.signInLink} accessibilityLabel="Sign in with your phone">
                  <Text style={styles.signInLinkText}>Sign in</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <PrimaryButton label={busy ? "Sending" : "Send to Chapman"} icon="send-outline" onPress={() => { void submit(); }} disabled={busy || !account || idea.trim().length < 4} />
            {busy ? <ActivityIndicator color={palette.accent} /> : null}
          </View>

          <Text style={styles.footer}>Chapman Prestige Limited, Kumasi.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  page: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingTop: 16, paddingBottom: 64, gap: 15 },
  intro: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  bubbleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bubbleColumn: { width: "31%", alignItems: "center", gap: 5, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  bubble: { width: 62, height: 62, borderRadius: 31, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.border },
  bubbleOpen: { backgroundColor: palette.blue, borderColor: palette.blue },
  bubbleInitials: { color: palette.accent, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 20 },
  bubbleInitialsOpen: { color: "#FFFFFF" },
  bubbleName: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 11, textAlign: "center", lineHeight: 14 },
  bubbleRole: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 9.5, textAlign: "center", lineHeight: 13 },
  detailCard: { borderRadius: 20, padding: 16, gap: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  detailTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  detailAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" },
  detailInitials: { color: palette.accent, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 17 },
  detailTopCopy: { flex: 1, gap: 2 },
  detailName: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 16 },
  detailRole: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 11 },
  detailClose: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: palette.soft },
  detailBio: { fontSize: 12, lineHeight: 18 },
  detailLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  detailLineText: { color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 12 },
  detailNote: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  ideaCard: { borderRadius: 20, padding: 15, gap: 11, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  ideaText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11.5, lineHeight: 17 },
  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  kindPill: { paddingHorizontal: 12, minHeight: 34, borderRadius: 99, alignItems: "center", justifyContent: "center", backgroundColor: palette.soft, borderWidth: 1, borderColor: palette.border },
  kindPillOn: { backgroundColor: palette.blue, borderColor: palette.blue },
  kindText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 11 },
  kindTextOn: { color: "#FFFFFF" },
  kindHint: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10.5, lineHeight: 15 },
  ideaInput: { minHeight: 96, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.soft, color: palette.ink, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, padding: 12, textAlignVertical: "top" },
  notice: { flexDirection: "row", alignItems: "center", gap: 7, padding: 10, borderRadius: 12, backgroundColor: palette.chipGreen },
  noticeBad: { backgroundColor: palette.chipRed },
  noticeText: { flex: 1, color: palette.green, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15 },
  noticeTextBad: { color: palette.error },
  signInNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, backgroundColor: palette.soft },
  signInNoteText: { flex: 1, color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10.5, lineHeight: 15 },
  signInLink: { paddingHorizontal: 12, minHeight: 32, borderRadius: 10, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" },
  signInLinkText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 11 },
  footer: { textAlign: "center", color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10.5, marginTop: 4 },
});
