import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { ChapmanMark, DisplayText, PrimaryButton, palette } from "@/components/chapman-ui";
import { cleanGhanaLocalEntry, cleanOtpCode, CustomerGender } from "@/lib/customer-auth-utils";
import { completeCustomerOnboarding, sendCustomerOtp, verifyCustomerOtp } from "@/lib/customer-auth";

type Stage = "phone" | "code" | "profile";

const genderOptions: { value: CustomerGender; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "female", label: "Female", icon: "woman-outline" },
  { value: "male", label: "Male", icon: "man-outline" },
  { value: "prefer_not_to_say", label: "Prefer not to say", icon: "person-outline" },
];

export default function PhoneAuthScreen() {
  const [stage, setStage] = useState<Stage>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<CustomerGender>("prefer_not_to_say");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => ({
    phone: { eyebrow: "CHAPMAN ACCOUNT", title: "Sign in with your phone.", body: "We will send a one-time code. Your number helps us keep your bookings and updates in one place." },
    code: { eyebrow: "VERIFY YOUR NUMBER", title: "Enter your six-digit code.", body: `We sent a code to ${verifiedPhone}. It expires quickly for your security.` },
    profile: { eyebrow: "ALMOST THERE", title: "Tell us how to address you.", body: "These details help Chapman prepare the right service experience. You can update them later." },
  })[stage], [stage, verifiedPhone]);

  const beginOtp = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const phone = await sendCustomerOtp(phoneInput);
      setVerifiedPhone(phone);
      setStage("code");
      setNotice("Your code is on its way.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not send a code. Please try again.");
    } finally { setBusy(false); }
  };

  const updatePhoneInput = (value: string) => {
    setPhoneInput(cleanGhanaLocalEntry(value));
  };

  const verifyOtp = async () => {
    if (code.length !== 6) { setError("Enter the full six-digit code."); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      await verifyCustomerOtp(verifiedPhone, code);
      setStage("profile");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That code could not be verified. Request a new code and try again.");
    } finally { setBusy(false); }
  };

  const finishOnboarding = async () => {
    if (name.trim().length < 2) { setError("Please enter the name you would like Chapman to use."); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      await completeCustomerOnboarding({ fullName: name.trim(), gender, email: email.trim() || undefined });
      router.replace("/(tabs)" as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your number is verified, but your profile could not be saved yet.");
    } finally { setBusy(false); }
  };

  return (
    <AppScreen dark edges={["top", "bottom", "left", "right"]}>
      <LinearGradient colors={[palette.deep, "#3E2D1D", palette.blue]} locations={[0, 0.56, 1]} style={styles.page}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => stage === "phone" ? router.back() : setStage(stage === "profile" ? "code" : "phone")} style={styles.backButton} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.mark}><ChapmanMark inverted size={34} /><Text style={styles.markText}>CHAPMAN PRESTIGE</Text></View>
            <View style={styles.step}><Text style={styles.stepText}>{stage === "phone" ? "1" : stage === "code" ? "2" : "3"}/3</Text></View>
          </View>

          <View style={styles.main}>
            <View style={styles.heroIcon}><Ionicons name={stage === "phone" ? "phone-portrait-outline" : stage === "code" ? "shield-checkmark-outline" : "person-outline"} size={37} color="#FFFFFF" /></View>
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <DisplayText style={styles.title}>{copy.title}</DisplayText>
            <Text style={styles.body}>{copy.body}</Text>

            <View style={styles.card}>
              {stage === "phone" ? <>
                <Text style={styles.fieldLabel}>Mobile number</Text>
                <View style={styles.field}><Text style={styles.country}>+233</Text><TextInput value={phoneInput} onChangeText={updatePhoneInput} keyboardType="number-pad" autoComplete="tel" maxLength={9} placeholder="24 123 4567" placeholderTextColor="#9A8B79" style={styles.input} editable={!busy} /></View>
                <Text style={styles.fieldHint}>Enter the 9 digits after +233. Do not start with 0. We never show it publicly.</Text>
              </> : null}

              {stage === "code" ? <>
                <Text style={styles.fieldLabel}>Verification code</Text>
                <TextInput value={code} onChangeText={(value) => setCode(cleanOtpCode(value))} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} placeholder="••••••" placeholderTextColor="#B8AA99" style={styles.codeInput} editable={!busy} />
                <TouchableOpacity disabled={busy} onPress={beginOtp} style={styles.resend}><Text style={styles.resendText}>Send a new code</Text></TouchableOpacity>
              </> : null}

              {stage === "profile" ? <>
                <Text style={styles.fieldLabel}>Your name</Text>
                <TextInput value={name} onChangeText={setName} autoComplete="name" placeholder="Your full name" placeholderTextColor="#9A8B79" style={styles.plainInput} editable={!busy} />
                <Text style={[styles.fieldLabel, styles.secondLabel]}>Profile preference</Text>
                <View style={styles.genderGrid}>{genderOptions.map((option) => <TouchableOpacity key={option.value} onPress={() => setGender(option.value)} style={[styles.genderOption, gender === option.value && styles.genderOptionActive]}><Ionicons name={option.icon} size={18} color={gender === option.value ? "#FFFFFF" : palette.blue} /><Text style={[styles.genderText, gender === option.value && styles.genderTextActive]}>{option.label}</Text></TouchableOpacity>)}</View>
                <Text style={[styles.fieldLabel, styles.secondLabel]}>Email address <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="name@email.com" placeholderTextColor="#9A8B79" style={styles.plainInput} editable={!busy} />
              </> : null}

              {notice ? <View style={styles.notice}><Ionicons name="checkmark-circle-outline" size={17} color={palette.green} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
              {error ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={17} color={palette.error} /><Text style={styles.errorText}>{error}</Text></View> : null}
            </View>
          </View>

          <View style={styles.footer}>
            <PrimaryButton label={busy ? "Please wait" : stage === "phone" ? "Send verification code" : stage === "code" ? "Verify and continue" : "Finish setup"} icon={busy ? undefined : "arrow-forward"} disabled={busy} onPress={stage === "phone" ? beginOtp : stage === "code" ? verifyOtp : finishOnboarding} />
            {busy ? <ActivityIndicator color="#FFFFFF" style={styles.loader} /> : null}
            {stage === "phone" ? <TouchableOpacity onPress={() => router.replace("/(tabs)" as never)} style={styles.guest}><Text style={styles.guestText}>Continue as guest</Text></TouchableOpacity> : null}
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 }, keyboard: { flex: 1, padding: 20, justifyContent: "space-between" }, topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", alignItems: "center", justifyContent: "center" }, mark: { flexDirection: "row", alignItems: "center", gap: 7 }, markText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: 0.8, fontSize: 10 }, step: { minWidth: 42, height: 27, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }, stepText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10 }, main: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 4, paddingTop: 26 }, heroIcon: { width: 80, height: 80, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 18 }, eyebrow: { color: "#E5D7BD", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.4, marginBottom: 6 }, title: { color: "#FFFFFF", textAlign: "center", fontSize: 28, lineHeight: 35, maxWidth: 330 }, body: { color: "#F2EBDD", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 9, maxWidth: 330 }, card: { width: "100%", marginTop: 24, backgroundColor: palette.canvas, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.32)" }, fieldLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 12, marginBottom: 8 }, field: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", overflow: "hidden" }, country: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14, paddingHorizontal: 13, borderRightWidth: 1, borderRightColor: palette.border }, input: { flex: 1, color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 15, paddingHorizontal: 13, alignSelf: "stretch" }, fieldHint: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, marginTop: 8 }, codeInput: { minHeight: 58, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 24, textAlign: "center", letterSpacing: 9, paddingLeft: 9 }, resend: { paddingTop: 12, alignSelf: "flex-start" }, resendText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 12 }, plainInput: { minHeight: 49, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 14, paddingHorizontal: 13 }, secondLabel: { marginTop: 15 }, optional: { color: palette.muted, fontFamily: "Inter_400Regular" }, genderGrid: { gap: 7 }, genderOption: { minHeight: 39, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 9 }, genderOptionActive: { backgroundColor: palette.blue, borderColor: palette.blue }, genderText: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12 }, genderTextActive: { color: "#FFFFFF" }, notice: { marginTop: 13, minHeight: 36, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 7, backgroundColor: "#E5F5EA", borderRadius: 11 }, noticeText: { flex: 1, color: palette.green, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15 }, error: { marginTop: 13, minHeight: 40, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 7, backgroundColor: "#FDEBEB", borderRadius: 11 }, errorText: { flex: 1, color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15 }, footer: { gap: 11 }, guest: { minHeight: 43, alignItems: "center", justifyContent: "center" }, guestText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 13 }, loader: { position: "absolute", right: 18, top: 17 },
});
