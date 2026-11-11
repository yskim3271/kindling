// Build for Cloudflare Workers and deploy, without packing local secrets into the Worker.
//
// The Cloudflare adapter copies Next's .env files into the bundle. That is fine for
// public values, but .env.local also holds the PayPal secret, so this script moves
// the file aside for the length of the build. The one build-time value the browser
// needs, the PayPal client ID, is passed through the environment instead.
//
//   node scripts/deploy-cloudflare.mjs            build and deploy
//   node scripts/deploy-cloudflare.mjs --build    build only
//
// Runtime secrets live in Cloudflare: `npx wrangler secret put <NAME>` for
// PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and TYPESAFE_API_KEY.
import { execSync } from "node:child_process";
import fs from "node:fs";

const ENV_FILE = ".env.local";
const ASIDE = ".env.aside.local"; // ignored by git, and not a name Next loads

const local = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
const clientId =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? local.match(/^NEXT_PUBLIC_PAYPAL_CLIENT_ID=(.+)$/m)?.[1]?.trim();

if (!clientId) {
  console.error("Set NEXT_PUBLIC_PAYPAL_CLIENT_ID in .env.local or in the environment first.");
  process.exit(1);
}

const moved = fs.existsSync(ENV_FILE);
if (moved) fs.renameSync(ENV_FILE, ASIDE);

try {
  const env = { ...process.env, NEXT_PUBLIC_PAYPAL_CLIENT_ID: clientId };
  execSync("npx opennextjs-cloudflare build", { stdio: "inherit", env });
  if (!process.argv.includes("--build")) {
    execSync("npx opennextjs-cloudflare deploy", { stdio: "inherit", env });
  }
} finally {
  if (moved) fs.renameSync(ASIDE, ENV_FILE);
}
