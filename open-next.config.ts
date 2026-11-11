import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page reads the live ledger, so there is nothing to cache between requests.
export default defineCloudflareConfig();
