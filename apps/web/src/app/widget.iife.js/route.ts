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
        // The file changes only on deploy; a short window keeps installed
        // sites current without hammering the instance.
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Widget build not found", { status: 503 });
  }
}
