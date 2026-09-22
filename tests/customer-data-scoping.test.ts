import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the rule that a customer can only ever ask the database for their own
 * records.
 *
 * The database enforces this too, but relying on it alone is fragile: if a
 * protection rule is ever switched off or missed, an unfiltered query silently
 * returns every customer's rows. Asking for the right rows in the first place
 * means a wrong row is never fetched, whatever the database is doing.
 *
 * These tests read the source rather than calling the functions, because the
 * functions need a live signed-in session.
 */

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

/** Every `.from("mobile_requests")` chain in a file, up to the next statement. */
function mobileRequestChains(source: string): string[] {
  const chains: string[] = [];
  const pattern = /\.from\((['"])mobile_requests\1\)([\s\S]{0,700}?);/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) chains.push(match[2]);
  return chains;
}

describe("customer data scoping", () => {
  it("only ever asks for this customer's own laundry requests", () => {
    const chains = mobileRequestChains(read("lib/mobile-requests.ts"));

    expect(chains.length, "expected to find mobile_requests queries to check").toBeGreaterThan(0);

    for (const chain of chains) {
      const hasScoping =
        chain.includes("customer_account_id") ||
        // Writes are checked by the database against the signed-in customer.
        chain.includes(".insert(") ||
        chain.includes(".upsert(");

      expect(
        hasScoping,
        `a mobile_requests query is missing a customer filter:\n${chain.trim()}`,
      ).toBe(true);
    }
  });

  it("scopes the realtime status map to the signed-in customer", () => {
    const source = read("components/mobile-request-update-listener.tsx");
    const chains = mobileRequestChains(source);

    expect(chains.length).toBeGreaterThan(0);
    for (const chain of chains) {
      expect(
        chain.includes("customer_account_id"),
        `the realtime listener loads requests without a customer filter:\n${chain.trim()}`,
      ).toBe(true);
    }
  });

  it("scopes saved routines to the signed-in customer", () => {
    const source = read("app/service/[id].tsx");
    const pattern = /\.from\((['"])routines\1\)([\s\S]{0,400}?);/g;
    let match: RegExpExecArray | null;
    let checked = 0;

    while ((match = pattern.exec(source)) !== null) {
      checked += 1;
      const chain = match[2];
      const hasScoping =
        chain.includes("client_id") || chain.includes(".insert(") || chain.includes(".upsert(");

      expect(hasScoping, `a routines query is missing a customer filter:\n${chain.trim()}`).toBe(true);
    }

    expect(checked, "expected to find routines queries to check").toBeGreaterThan(0);
  });

  it("never writes to a customer record by id alone", () => {
    // An update by id on its own will happily write to whatever record the id
    // happens to name. Every update must name the owner as well. This is the
    // check that caught the unscoped quote update.
    const sources = ["app/booking/[id].tsx", "lib/booking-store.tsx", "lib/mobile-requests.ts"];

    for (const path of sources) {
      const source = read(path);
      const chains = [
        ...source.matchAll(/\.from\((['"])(quote_requests|mobile_requests|routines)\1\)([\s\S]{0,700}?);/g),
      ];

      for (const chain of chains) {
        const body = chain[3];
        if (!body.includes(".update(") && !body.includes(".delete(")) continue;

        const scoped =
          body.includes("customer_account_id") || body.includes("client_id");
        const namesOwnerSomewhere = body.includes('eq("id"') || body.includes("eq('id'");

        expect(
          scoped || !namesOwnerSomewhere,
          `${path} writes to a customer record by id without confirming the owner:\n${body.trim()}`,
        ).toBe(true);
      }
    }
  });

  it("says so plainly when a tracking page cannot find the request", () => {
    // The tracking page used to fall back to "your service date is approved"
    // whenever it could not resolve the request at all, so a customer whose
    // request failed to load was told something that was not true.
    const source = read("app/booking/[id].tsx");

    expect(
      source.includes("foundNothing"),
      "the tracking page must work out whether it found the request at all",
    ).toBe(true);
    expect(
      source.includes("We could not find this request."),
      "the tracking page must say so plainly when the request cannot be found",
    ).toBe(true);
    expect(
      source.includes('"Your service date is approved."'),
      "an approval may only ever be stated for a request that is genuinely approved",
    ).toBe(false);
  });

  it("never reads a customer record by id alone", () => {
    // A lookup by id is the easiest way to accidentally read somebody else's
    // record, because the id is the only thing that has to be guessed.
    const sources = ["lib/mobile-requests.ts", "app/booking/[id].tsx", "lib/booking-store.tsx"];

    for (const path of sources) {
      const source = read(path);
      const chains = [...source.matchAll(/\.from\((['"])(mobile_requests|quote_requests|routines)\1\)([\s\S]{0,700}?);/g)];

      for (const chain of chains) {
        const body = chain[3];
        if (!body.includes(".select(")) continue; // writes are handled above
        if (!body.includes(".eq('id'") && !body.includes('.eq("id"')) continue;

        const scoped =
          body.includes("customer_account_id") || body.includes("client_id");

        expect(
          scoped,
          `${path} reads a record by id without confirming the owner:\n${body.trim()}`,
        ).toBe(true);
      }
    }
  });
});
