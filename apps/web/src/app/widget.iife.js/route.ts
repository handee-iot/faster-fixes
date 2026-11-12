import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The workspace package's build output. A self-hosted instance serves its own
// widget, so an install always matches the deployment. Unlike the e2e fixture,
// this route exists in production too.
const IIFE_FILE = join(
  process.cwd(),
  "node_modules/@fasterfixes/widget/dist/widget.iife.js",
);

// Read per request: a static optimization would pin Next's own long cache and
// leave installed sites on an old widget for hours after a deploy.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const script = await readFile(IIFE_FILE, "utf8");
    return new Response(script, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        // `no-store` rather than a short `max-age`: Cloudflare's Browser Cache
        // TTL rewrites `max-age` to four hours on this zone, which stranded
        // installed sites on the previous bundle after a deploy. The script is
        // ~34KB gzipped, so fetching it per page load is cheap.
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Widget build not found", { status: 503 });
  }
}
