/**
 * The rules for the 4 digit app PIN.
 *
 * Kept separate from the storage and the screen so the rules can be tested on
 * their own, without a phone, a keychain, or a network.
 */

/** A PIN is exactly this many digits, nothing else. */
export const PIN_LENGTH = 4;

/**
 * Wrong tries allowed before the app gives up on the PIN and asks for a fresh
 * text message. Someone holding a stolen phone gets five guesses out of 10,000.
 */
export const MAX_PIN_ATTEMPTS = 5;

/** True only for exactly four digits, 0 to 9 each. */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^[0-9]{${PIN_LENGTH}}$`).test(pin);
}

/**
 * True when the PIN saved on this phone belongs to the account signing in.
 *
 * The PIN is kept on the phone, and it is kept when a customer signs out, so that
 * signing back in with a text message is followed by the PIN rather than by a
 * stranger's PIN. That only works if the PIN remembers whose it is. A PIN set by
 * someone else on a shared phone answers false, and the caller leaves it alone and
 * lets the new person through, which is also why the check is written here rather
 * than buried in the storage code.
 */
export function pinBelongsTo(pinOwner: string | null | undefined, accountId: string | null | undefined): boolean {
  const owner = (pinOwner ?? "").trim();
  const account = (accountId ?? "").trim();
  return owner.length > 0 && owner === account;
}

/** How many tries are left after this many wrong answers. Never below zero. */
export function attemptsLeft(failedAttempts: number): number {
  return Math.max(0, MAX_PIN_ATTEMPTS - Math.max(0, failedAttempts));
}

/** True once the tries are used up, at which point the PIN is thrown away. */
export function shouldForgetPin(failedAttempts: number): boolean {
  return attemptsLeft(failedAttempts) === 0;
}

/**
 * Wording for the tries that remain. Deliberately explicit once it gets close,
 * because the next step is a text message the customer would rather not need.
 */
export function wrongPinMessage(failedAttempts: number): string {
  const left = attemptsLeft(failedAttempts);
  if (left === 0) return "That was the last try. Please sign in again with your phone number.";
  if (left === 1) return "Wrong PIN. 1 try left before you need a new text message.";
  return `Wrong PIN. ${left} tries left.`;
}

/**
 * Where a forgotten PIN sends the customer, which depends on why they are being
 * asked for it at all. This is the single most important rule in this file, so it
 * is written out and tested rather than left inside a screen.
 *
 * "opening-the-app": the app was closed and opened again. Nothing has proved who
 * is holding the phone, so a forgotten PIN cannot simply be waved through. The
 * only way past is to prove the phone number again with a fresh text message,
 * which also means the old PIN is thrown away.
 *
 * "finishing-sign-in": the customer has just entered the six digit code that was
 * texted to this phone seconds ago. Their identity is already proved, so the PIN
 * at this point is a confirmation, not a second lock, and a forgotten one must not
 * undo a sign-in that has already succeeded.
 *
 * The rule is one-sided on purpose: opening the app can never answer
 * "carry-on-without-pin".
 */
export type PinRecoverySituation = "opening-the-app" | "finishing-sign-in";

export function pinRecoveryRoute(situation: PinRecoverySituation): "sign-in-again" | "carry-on-without-pin" {
  return situation === "finishing-sign-in" ? "carry-on-without-pin" : "sign-in-again";
}
