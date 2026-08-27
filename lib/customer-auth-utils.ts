/** Converts common Ghana phone formats to the E.164 value required by SMS OTP. */
export function normalizeGhanaPhone(input: string): string | null {
  const compact = input.replace(/[\s()-]/g, "");
  if (!compact) return null;

  const local = compact.startsWith("0") ? `+233${compact.slice(1)}` : compact;
  const international = local.startsWith("233") ? `+${local}` : local;

  return /^\+233\d{9}$/.test(international) ? international : null;
}

export function cleanOtpCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}

export type CustomerGender = "female" | "male" | "prefer_not_to_say";
