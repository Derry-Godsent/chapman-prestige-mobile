/**
 * Builds the web version, and stamps it with an identity.
 *
 * The stamp is what lets a phone that already has the app on its home screen
 * notice that a newer one exists, instead of sitting on whatever it downloaded the
 * day it was added. Two things are produced from the same value: a meta tag inside
 * every page, and a tiny version.json next to them. The app compares the two and
 * refreshes itself when they disagree.
 *
 * One build command for both hosts, so Vercel and GitHub Pages cannot drift apart:
 * run with `node scripts/build-web.mjs`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

/** A value that changes whenever the code does. Prefers the commit, falls back to the clock. */
function buildId() {
  const fromHost = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromHost) return fromHost.slice(0, 12);
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { cwd: root }).toString().trim();
  } catch {
    return `t${Date.now()}`;
  }
}

const id = buildId();
const outDir = process.env.EXPO_WEB_OUTPUT_DIR || "dist";

console.log(`Building the web app, stamp ${id}`);

execFileSync("npx", ["expo", "export", "--platform", "web", "--output-dir", outDir], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, EXPO_PUBLIC_BUILD_ID: id },
});

mkdirSync(join(root, outDir), { recursive: true });
writeFileSync(join(root, outDir, "version.json"), `${JSON.stringify({ id }, null, 2)}\n`);
console.log(`Wrote ${outDir}/version.json`);
