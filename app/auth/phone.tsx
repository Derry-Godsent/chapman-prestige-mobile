import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<CustomerGender>("prefer_not_to_say");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptedOtpRef = useRef<string | null>(null);

  const code = otpDigits.join("");
  const countdownLabel = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`;
  const canResend = secondsRemaining === 0;

  const copy = useMemo(() => ({
    phone: { eyebrow: "CHAPMAN ACCOUNT", title: "Sign in with your phone.", body: "We will send a one-time code. Your number helps us keep your bookings and updates in one place." },
    code: { eyebrow: "VERIFY YOUR NUMBER", title: "Enter your six-digit code.", body: `We sent a code to ${verifiedPhone}. Enter it as soon as it arrives.` },
    profile: { eyebrow: "ALMOST THERE", title: "Tell us how to address you.", body: "These details help Chapman prepare the right service experience. You can update them later." },
  })[stage], [stage, verifiedPhone]);

  useEffect(() => {
    if (stage !== "code" || secondsRemaining === 0) return;
    const interval = setInterval(() => setSecondsRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining, stage]);

  useEffect(() => {
    if (stage !== "code") return;
    const focusTimeout = setTimeout(() => otpInputRefs.current[0]?.focus(), 180);
    return () => clearTimeout(focusTimeout);
  }, [stage]);

  const beginOtp = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const phone = await sendCustomerOtp(phoneInput);
      setVerifiedPhone(phone);
      setOtpDigits(["", "", "", "", "", ""]);
      attemptedOtpRef.current = null;
      setSecondsRemaining(5 * 60);
      setStage("code");
      setNotice("Your code is on its way.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not send a code. Please try again.");
    } finally { setBusy(false); }
  };

  const updatePhoneInput = (value: string) => {
    setPhoneInput(cleanGhanaLocalEntry(value));
  };

  const updateOtpDigit = (value: string, index: number) => {
    const digits = cleanOtpCode(value);
    setOtpDigits((current) => {
      const next = [...current];
      if (digits.length > 1) {
        digits.slice(0, 6 - index).split("").forEach((digit, offset) => { next[index + offset] = digit; });
      } else {
        next[index] = digits;
      }
      return next;
    });

    if (digits.length > 0) {
      const nextIndex = Math.min(index + digits.length, 5);
      requestAnimationFrame(() => otpInputRefs.current[nextIndex]?.focus());
    }
  };

  const handleOtpBackspace = (index: number) => {
    if (otpDigits[index] || index === 0) return;
    setOtpDigits((current) => {
      const next = [...current];
      next[index - 1] = "";
      return next;
    });
    requestAnimationFrame(() => otpInputRefs.current[index - 1]?.focus());
  };

  const goBack = () => {
    setError(null);
    setNotice(null);
    if (stage === "phone") { router.back(); return; }
    if (stage === "code") { setSecondsRemaining(0); Keyboard.dismiss(); }
    setStage(stage === "profile" ? "code" : "phone");
  };

  const verifyOtp = async () => {
    if (code.length !== 6) { setError("Enter the full six-digit code."); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      await verifyCustomerOtp(verifiedPhone, code);
      Keyboard.dismiss();
      setStage("profile");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That code could not be verified. Request a new code and try again.");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (stage !== "code" || busy || code.length !== 6 || attemptedOtpRef.current === code) return;
    attemptedOtpRef.current = code;
    void verifyOtp();
  }, [busy, code, stage]);

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
        <View style={styles.keyboard}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={goBack} style={styles.backButton} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.mark}><ChapmanMark inverted size={34} /><Text style={styles.markText}>CHAPMAN PRESTIGE</Text></View>
            <View style={styles.step}><Text style={styles.stepText}>{stage === "phone" ? "1" : stage === "code" ? "2" : "3"}/3</Text></View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
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
                <View style={styles.otpRow}>
                  {otpDigits.map((digit, index) => <TextInput key={index} ref={(input) => { otpInputRefs.current[index] = input; }} value={digit} onChangeText={(value) => updateOtpDigit(value, index)} onKeyPress={({ nativeEvent }) => nativeEvent.key === "Backspace" && handleOtpBackspace(index)} keyboardType="number-pad" autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"} textContentType="oneTimeCode" maxLength={6} style={[styles.otpCell, digit.length > 0 && styles.otpCellFilled]} editable={!busy} accessibilityLabel={`Verification code digit ${index + 1} of 6`} />)}
                </View>
                <View style={styles.inlineVerify}>
                  <PrimaryButton label={busy ? "Verifying code" : "Verify code"} icon={busy ? undefined : "arrow-forward"} disabled={busy || code.length !== 6} onPress={verifyOtp} />
                </View>
                <View style={styles.countdown}>
                  <Ionicons name="time-outline" size={17} color={palette.green} />
                  <View style={styles.countdownCopy}><Text style={styles.countdownTitle}>Waiting for your code</Text><Text style={styles.countdownText}>{canResend ? "You can request another code now." : `You can request another code in ${countdownLabel}.`}</Text></View>
                </View>
                <TouchableOpacity disabled={busy || !canResend} onPress={beginOtp} style={[styles.resend, (!canResend || busy) && styles.resendDisabled]}><Text style={[styles.resendText, (!canResend || busy) && styles.resendTextDisabled]}>{canResend ? "Send a new code" : `Resend available in ${countdownLabel}`}</Text></TouchableOpacity>
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
          </ScrollView>

          {stage !== "code" ? <View style={styles.footer}>
            <PrimaryButton label={busy ? "Please wait" : stage === "phone" ? "Send verification code" : "Finish setup"} icon={busy ? undefined : "arrow-forward"} disabled={busy} onPress={stage === "phone" ? beginOtp : finishOnboarding} />
            {busy ? <ActivityIndicator color="#FFFFFF" style={styles.loader} /> : null}
            {stage === "phone" ? <TouchableOpacity onPress={() => router.replace("/(tabs)" as never)} style={styles.guest}><Text style={styles.guestText}>Continue as guest</Text></TouchableOpacity> : null}
          </View> : null}
        </View>
      </LinearGradient>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 }, keyboard: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }, topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", alignItems: "center", justifyContent: "center" }, mark: { flexDirection: "row", alignItems: "center", gap: 7 }, markText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: 0.8, fontSize: 10 }, step: { minWidth: 42, height: 27, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }, stepText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10 }, scroll: { flex: 1 }, scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 }, main: { alignItems: "center", paddingHorizontal: 4 }, heroIcon: { width: 80, height: 80, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 18 }, eyebrow: { color: "#E5D7BD", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.4, marginBottom: 6 }, title: { color: "#FFFFFF", textAlign: "center", fontSize: 28, lineHeight: 35, maxWidth: 330 }, body: { color: "#F2EBDD", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 9, maxWidth: 330 }, card: { width: "100%", marginTop: 24, backgroundColor: palette.canvas, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.32)" }, fieldLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 12, marginBottom: 8 }, field: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", overflow: "hidden" }, country: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14, paddingHorizontal: 13, borderRightWidth: 1, borderRightColor: palette.border }, input: { flex: 1, color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 15, paddingHorizontal: 13, alignSelf: "stretch" }, fieldHint: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, marginTop: 8 }, otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 7 }, otpCell: { flex: 1, minHeight: 54, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 21, textAlign: "center", paddingHorizontal: 0 }, otpCellFilled: { borderColor: palette.green, backgroundColor: "#F3FBF5" }, inlineVerify: { marginTop: 14 }, countdown: { marginTop: 14, minHeight: 47, flexDirection: "row", alignItems: "center", paddingHorizontal: 11, gap: 9, backgroundColor: "#E5F5EA", borderRadius: 12 }, countdownCopy: { flex: 1, gap: 2 }, countdownTitle: { color: palette.green, fontFamily: "Inter_700Bold", fontSize: 11 }, countdownText: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 10, lineHeight: 14 }, resend: { paddingTop: 12, alignSelf: "flex-start" }, resendDisabled: { opacity: 0.55 }, resendText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 12 }, resendTextDisabled: { color: palette.muted }, plainInput: { minHeight: 49, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 14, paddingHorizontal: 13 }, secondLabel: { marginTop: 15 }, optional: { color: palette.muted, fontFamily: "Inter_400Regular" }, genderGrid: { gap: 7 }, genderOption: { minHeight: 39, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 9 }, genderOptionActive: { backgroundColor: palette.blue, borderColor: palette.blue }, genderText: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12 }, genderTextActive: { color: "#FFFFFF" }, notice: { marginTop: 13, minHeight: 36, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 7, backgroundColor: "#E5F5EA", borderRadius: 11 }, noticeText: { flex: 1, color: palette.green, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15 }, error: { marginTop: 13, minHeight: 40, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 7, backgroundColor: "#FDEBEB", borderRadius: 11 }, errorText: { flex: 1, color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15 }, footer: { gap: 11, paddingTop: 8 }, guest: { minHeight: 43, alignItems: "center", justifyContent: "center" }, guestText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 13 }, loader: { position: "absolute", right: 18, top: 25 },
});
