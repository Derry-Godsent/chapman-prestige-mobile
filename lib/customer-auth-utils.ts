/** Converts common Ghana phone formats to the E.164 value required by SMS OTP. */
export function normalizeGhanaPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (/^\d{9}$/.test(digits)) return `+233${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+233${digits.slice(1)}`;
  if (/^233\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

/** Keeps only the nine local Ghana digits shown after the fixed +233 prefix. */
export function cleanGhanaLocalEntry(input: string): string {
  const digits = input.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("233") ? digits.slice(3) : digits;
  const withoutLeadingZero = withoutCountryCode.startsWith("0") ? withoutCountryCode.slice(1) : withoutCountryCode;
  return withoutLeadingZero.slice(0, 9);
}

export function cleanOtpCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}

export type CustomerGender = "female" | "male" | "prefer_not_to_say";
