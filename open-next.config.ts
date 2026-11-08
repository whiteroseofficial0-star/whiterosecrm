import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Incremental cache is disabled by default (dummy).
  // To enable caching of ISR/SSG pages, configure an R2 bucket per
  // https://opennext.js.org/cloudflare/caching
});