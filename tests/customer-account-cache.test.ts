import { describe, expect, it, vi } from "vitest";

import { createAccountCache } from "../lib/customer-account-cache";
import type { CustomerAccount } from "../lib/customer-auth";

const customer: CustomerAccount = {
  auth_user_id: "user-1",
  client_id: "client-1",
  phone: "+233241234567",
  full_name: "Ama Mensah",
  email: null,
  gender: "female",
  avatar_style: "female",
  profile_completed_at: "2026-09-01T10:00:00.000Z",
};

describe("the shared customer account", () => {
  it("reports nothing as checking, so no screen shows a sign-in prompt early", () => {
    const cache = createAccountCache(async () => customer);
    // undefined is the honest answer before anything is asked: still checking.
    expect(cache.read()).toBeUndefined();
  });

  it("remembers the account so a second screen shows it straight away", async () => {
    const fetchAccount = vi.fn(async () => customer);
    const cache = createAccountCache(fetchAccount);

    await cache.load();
    expect(cache.read()).toEqual(customer);

    const secondScreen = await cache.load();
    expect(secondScreen).toEqual(customer);
    expect(fetchAccount).toHaveBeenCalledTimes(1);
  });

  it("asks once when several screens open at the same moment", async () => {
    const fetchAccount = vi.fn(async () => customer);
    const cache = createAccountCache(fetchAccount);

    const [first, second, third] = await Promise.all([cache.load(), cache.load(), cache.load()]);

    expect(fetchAccount).toHaveBeenCalledTimes(1);
    expect([first, second, third]).toEqual([customer, customer, customer]);
  });

  it("never signs a known customer out because a request failed", async () => {
    let shouldFail = false;
    const cache = createAccountCache(async () => {
      if (shouldFail) throw new Error("network is slow");
      return customer;
    });

    await cache.load();
    shouldFail = true;

    const afterFailure = await cache.load(true);

    expect(afterFailure).toEqual(customer);
    expect(cache.read()).toEqual(customer);
  });

  it("says plainly that nobody is signed in when the first check fails", async () => {
    const cache = createAccountCache(async () => { throw new Error("no connection"); });

    const result = await cache.load();

    // Not left spinning forever: a real answer, so the screen can offer sign in.
    expect(result).toBeNull();
    expect(cache.read()).toBeNull();
  });

  it("forgets the account when the customer signs out", async () => {
    const cache = createAccountCache(async () => customer);
    await cache.load();

    cache.forget();

    expect(cache.read()).toBeNull();
  });

  it("tells every open screen when the account changes or is cleared", async () => {
    const cache = createAccountCache(async () => customer);
    const seen: Array<CustomerAccount | null | undefined> = [];
    cache.subscribe((account) => seen.push(account));

    await cache.load();
    cache.forget();

    expect(seen).toEqual([customer, null]);
  });

  it("stops telling a screen once it has closed", async () => {
    const cache = createAccountCache(async () => customer);
    const seen: unknown[] = [];
    const stopWatching = cache.subscribe((account) => seen.push(account));

    stopWatching();
    await cache.load();

    expect(seen).toEqual([]);
  });
});
