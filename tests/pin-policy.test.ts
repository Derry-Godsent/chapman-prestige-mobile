import { describe, expect, it } from "vitest";

import { MAX_PIN_ATTEMPTS, PIN_LENGTH, attemptsLeft, isValidPin, shouldForgetPin, wrongPinMessage } from "../lib/pin-policy";

describe("app PIN rules", () => {
  it("accepts exactly four digits", () => {
    expect(PIN_LENGTH).toBe(4);
    expect(isValidPin("2048")).toBe(true);
    expect(isValidPin("0000")).toBe(true);
    expect(isValidPin("9999")).toBe(true);
  });

  it("refuses anything that is not four digits", () => {
    expect(isValidPin("")).toBe(false);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin(" 1234")).toBe(false);
    expect(isValidPin("12 4")).toBe(false);
    expect(isValidPin("12.4")).toBe(false);
  });

  it("counts the tries down and stops at zero", () => {
    expect(attemptsLeft(0)).toBe(MAX_PIN_ATTEMPTS);
    expect(attemptsLeft(1)).toBe(MAX_PIN_ATTEMPTS - 1);
    expect(attemptsLeft(MAX_PIN_ATTEMPTS)).toBe(0);
    expect(attemptsLeft(MAX_PIN_ATTEMPTS + 3)).toBe(0);
    expect(attemptsLeft(-2)).toBe(MAX_PIN_ATTEMPTS);
  });

  it("gives up on the PIN only once the tries are used up", () => {
    expect(shouldForgetPin(MAX_PIN_ATTEMPTS - 1)).toBe(false);
    expect(shouldForgetPin(MAX_PIN_ATTEMPTS)).toBe(true);
    expect(shouldForgetPin(MAX_PIN_ATTEMPTS + 1)).toBe(true);
  });

  it("tells the customer how many tries are left, in plain words", () => {
    expect(wrongPinMessage(1)).toBe("Wrong PIN. 4 tries left.");
    expect(wrongPinMessage(MAX_PIN_ATTEMPTS - 1)).toBe("Wrong PIN. 1 try left before you need a new text message.");
    expect(wrongPinMessage(MAX_PIN_ATTEMPTS)).toContain("last try");
  });
});
