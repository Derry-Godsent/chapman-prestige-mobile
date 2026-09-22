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
