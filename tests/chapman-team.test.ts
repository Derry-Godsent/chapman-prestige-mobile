import { describe, expect, it } from "vitest";

import { CHAPMAN_TEAM, teamInitials } from "../lib/chapman-team";

/**
 * The team page reads straight from the Chapman website, so these checks keep it
 * honest: everyone listed, everyone described, nobody repeated, and no icons or
 * dashes hiding in the words.
 */
describe("the Chapman team", () => {
  it("lists all eight people from the website, founder first", () => {
    expect(CHAPMAN_TEAM).toHaveLength(8);
    expect(CHAPMAN_TEAM[0].name).toBe("William Chapman");
    expect(CHAPMAN_TEAM[0].role).toContain("CEO");
    expect(CHAPMAN_TEAM[CHAPMAN_TEAM.length - 1].name).toBe("Prosper Agbetsiame");
  });

  it("splits the team into leadership and site without losing anyone", () => {
    const leadership = CHAPMAN_TEAM.filter((member) => member.group === "leadership");
    const site = CHAPMAN_TEAM.filter((member) => member.group === "site");
    expect(leadership).toHaveLength(4);
    expect(site).toHaveLength(4);
    expect(leadership.length + site.length).toBe(CHAPMAN_TEAM.length);
  });

  it("gives every person a role and a real description", () => {
    for (const member of CHAPMAN_TEAM) {
      expect(member.name.trim().length).toBeGreaterThan(4);
      expect(member.role.trim().length).toBeGreaterThan(4);
      expect(member.bio.trim().length).toBeGreaterThan(40);
    }
  });

  it("keeps every person once, with a usable id", () => {
    const ids = CHAPMAN_TEAM.map((member) => member.id);
    const names = CHAPMAN_TEAM.map((member) => member.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("writes plain words, with no icons or long dashes", () => {
    for (const member of CHAPMAN_TEAM) {
      const text = `${member.name} ${member.role} ${member.bio}`;
      expect([...text].every((character) => character.codePointAt(0)! < 127)).toBe(true);
      expect(text).not.toContain("—");
      expect(text).not.toContain("–");
      expect(text).not.toContain("\n");
    }
  });

  it("settles on two letters for a bubble", () => {
    expect(teamInitials(CHAPMAN_TEAM[0])).toBe("WC");
    expect(teamInitials(CHAPMAN_TEAM[CHAPMAN_TEAM.length - 1])).toBe("PA");
    for (const member of CHAPMAN_TEAM) {
      expect(teamInitials(member)).toMatch(/^[A-Z]{2}$/);
    }
  });
});
