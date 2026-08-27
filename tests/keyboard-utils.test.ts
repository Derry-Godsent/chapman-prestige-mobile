import { beforeEach, describe, expect, it, vi } from "vitest";

const keyboardDismiss = vi.hoisted(() => vi.fn());

vi.mock("react-native", () => ({
  Keyboard: {
    dismiss: keyboardDismiss,
  },
}));

import { dismissKeyboard } from "../lib/keyboard-utils";

describe("keyboard dismissal", () => {
  beforeEach(() => {
    keyboardDismiss.mockReset();
  });

  it("delegates outside-tap dismissal to the native keyboard API", () => {
    dismissKeyboard();

    expect(keyboardDismiss).toHaveBeenCalledTimes(1);
  });
});
