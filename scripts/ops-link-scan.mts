import { config } from "dotenv";
config({ path: ".env.local" });

import { scanInternalLinks } from "../lib/link-health";

const base =
  process.argv.find((a) => a.startsWith("--base="))?.slice(7) ??
  "https://tkad-web.vercel.app";

const result = await scanInternalLinks({
  baseUrl: base,
  locale: "ko",
  mediaLimit: 30,
});

console.log(
  JSON.stringify(
    {
      baseUrl: result.baseUrl,
      scanned: result.scanned,
      okCount: result.okCount,
      brokenCount: result.broken.length,
      broken: result.broken.map((b) => ({
        path: b.path,
        status: b.status,
        error: b.error,
      })),
      toolsRedirect: result.redirected.filter((r) => r.path === "/tools"),
    },
    null,
    2,
  ),
);
