import fs from "node:fs";
import path from "node:path";

/**
 * Minimal .env loader for the test run.
 *
 * System environment variables always win, matching the priority used by
 * `scripts/load-env.js` for the Expo build.
 */
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    if (!line || line.trim().startsWith("#")) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
