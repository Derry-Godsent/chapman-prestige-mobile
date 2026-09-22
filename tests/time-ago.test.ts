import { describe, expect, it } from "vitest";

import { newestFirst, timeAgo } from "../lib/chapman-format";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-09-20T12:00:00.000Z");

describe("timeAgo", () => {
  it("counts in minutes while the request is fresh", () => {
    expect(timeAgo("2026-09-20T11:59:30.000Z", NOW)).toBe("just now");
    expect(timeAgo("2026-09-20T11:59:00.000Z", NOW)).toBe("1 min ago");
    expect(timeAgo("2026-09-20T11:16:00.000Z", NOW)).toBe("44 min ago");
  });

  it("switches to hours once an hour has passed, and to days after that", () => {
    expect(timeAgo("2026-09-20T11:00:00.000Z", NOW)).toBe("1 hr ago");
    expect(timeAgo("2026-09-20T07:00:00.000Z", NOW)).toBe("5 hrs ago");
    expect(timeAgo("2026-09-19T11:00:00.000Z", NOW)).toBe("yesterday");
    expect(timeAgo("2026-09-16T12:00:00.000Z", NOW)).toBe("4 days ago");
  });

  it("shows a plain date once the request is older than a month", () => {
    const label = timeAgo("2026-07-01T12:00:00.000Z", NOW);
    expect(label).not.toContain("ago");
    expect(label).toMatch(/Jul/);
  });

  it("says nothing rather than something wrong when there is no usable timestamp", () => {
    expect(timeAgo(null, NOW)).toBe("");
    expect(timeAgo(undefined, NOW)).toBe("");
    expect(timeAgo("not a date", NOW)).toBe("");
  });

  it("treats a clock running slightly ahead as brand new, not as a negative age", () => {
    expect(timeAgo("2026-09-20T12:00:30.000Z", NOW)).toBe("just now");
  });
});

describe("newestFirst", () => {
  it("puts the most recent request at the top of the screen", () => {
    const rows = [
      { id: "old", createdAt: "2026-09-01T09:00:00.000Z" },
      { id: "new", createdAt: "2026-09-20T09:00:00.000Z" },
      { id: "middle", createdAt: "2026-09-10T09:00:00.000Z" },
    ];
    expect(newestFirst(rows, (row) => row.createdAt).map((row) => row.id)).toEqual(["new", "middle", "old"]);
  });

  it("keeps rows with no usable timestamp at the end, without dropping them", () => {
    const rows = [
      { id: "missing", createdAt: null },
      { id: "dated", createdAt: "2026-09-10T09:00:00.000Z" },
    ];
    expect(newestFirst(rows, (row) => row.createdAt).map((row) => row.id)).toEqual(["dated", "missing"]);
  });

  it("leaves the original list untouched", () => {
    const rows = [{ id: "a", createdAt: "2026-09-01T09:00:00.000Z" }, { id: "b", createdAt: "2026-09-02T09:00:00.000Z" }];
    newestFirst(rows, (row) => row.createdAt);
    expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
  });
});
