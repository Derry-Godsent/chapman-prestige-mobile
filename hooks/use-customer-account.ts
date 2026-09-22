import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { getCurrentCustomerAccount } from "@/lib/customer-auth";
import { AccountCache, AccountState, createAccountCache } from "@/lib/customer-account-cache";

/**
 * One shared customer account for the whole app.
 *
 * Every screen used to fetch the account for itself when it opened, and each
 * fetch took a moment. During that moment a screen could not tell "checking"
 * apart from "signed out", so a signed-in customer was shown the sign-in prompt
 * for a second before their own details appeared.
 *
 * The remembering itself lives in lib/customer-account-cache.ts, where the rules
 * are tested. This file is the app's one copy of it, plus the wiring that clears
 * it when the customer signs out.
 */

let cache: AccountCache | null = null;
let authWatchStarted = false;

function accountCache(): AccountCache {
  if (!cache) cache = createAccountCache(getCurrentCustomerAccount);
  return cache;
}

/** The remembered account, without waiting. Used by screens that act on demand. */
export function readCustomerAccount(): AccountState {
  return accountCache().read();
}

/** The remembered account, arriving now if it is already known. */
export function loadCustomerAccount(force = false): Promise<AccountState> {
  return accountCache().load(force);
}

/** The customer signed out. Forget them everywhere the app is watching. */
export function forgetCustomerAccount() {
  accountCache().forget();
}

function watchAuthOnce() {
  if (authWatchStarted || !supabase) return;
  authWatchStarted = true;
  supabase.auth.onAuthStateChange((event) => {
    // Supabase asks that no other Supabase call runs inside this callback, so a
    // refresh that follows a sign-in waits a moment before it starts.
    if (event === "SIGNED_OUT") {
      forgetCustomerAccount();
      return;
    }
    if (event === "SIGNED_IN" || event === "USER_UPDATED") {
      setTimeout(() => { void loadCustomerAccount(true); }, 0);
    }
  });
}

export function useCustomerAccount() {
  const [account, setAccount] = useState<AccountState>(() => accountCache().read());

  useEffect(() => {
    const store = accountCache();
    watchAuthOnce();
    if (store.read() === undefined) void store.load();
    return store.subscribe(setAccount);
  }, []);

  return {
    account,
    /** True only while the very first check is running. */
    checking: account === undefined,
    signedIn: account != null,
    reload: () => loadCustomerAccount(true),
  };
}
