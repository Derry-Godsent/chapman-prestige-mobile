import { CustomerAccount } from "@/lib/customer-auth";

/**
 * The remembered customer account, as plain logic.
 *
 * Three rules matter here, and they are the reason this is not written inside a
 * screen:
 *
 * 1. Ask once. Several screens can open at the same moment, and they must not
 *    each start their own check.
 * 2. Never turn a signed-in customer into a signed-out one because a request was
 *    slow or failed. Only a real sign-out clears the account.
 * 3. When there is nothing remembered and the check fails, say so plainly rather
 *    than leaving a screen spinning forever.
 *
 * "undefined" means still checking, "null" means genuinely not signed in.
 */

export type AccountState = CustomerAccount | null | undefined;

export type AccountCache = {
  /** The remembered account, without waiting. */
  read: () => AccountState;
  /** The remembered account, arriving now if it is already known. */
  load: (force?: boolean) => Promise<AccountState>;
  /** Forget the account, because the customer signed out. */
  forget: () => void;
  /** Watch for changes. Returns a function that stops watching. */
  subscribe: (listener: (account: AccountState) => void) => () => void;
};

export function createAccountCache(fetchAccount: () => Promise<CustomerAccount | null>): AccountCache {
  let remembered: AccountState;
  let inFlight: Promise<AccountState> | null = null;
  const listeners = new Set<(account: AccountState) => void>();

  const publish = (account: AccountState) => {
    remembered = account;
    listeners.forEach((listener) => listener(account));
  };

  const load = (force = false): Promise<AccountState> => {
    if (!force && remembered !== undefined) return Promise.resolve(remembered);
    if (inFlight) return inFlight;

    inFlight = fetchAccount()
      .then((account) => {
        publish(account);
        return account;
      })
      .catch(() => {
        // A slow or failed check is not a sign-out. Keep a known customer signed
        // in, and only report signed out when there was never an account to lose.
        if (remembered === undefined) publish(null);
        return remembered;
      })
      .then((account) => {
        inFlight = null;
        return account;
      });

    return inFlight;
  };

  return {
    read: () => remembered,
    load,
    forget: () => publish(null),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
