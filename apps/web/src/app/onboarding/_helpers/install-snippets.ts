export const REACT_INSTALL_COMMAND = "npm install @fasterfixes/react";

// The `@1` channel serves every 1.x release, so the snippet never needs editing for a fix.
export const SCRIPT_EMBED_URL =
  "https://cdn.jsdelivr.net/npm/@fasterfixes/widget@1/dist/widget.iife.js";

// The widget's built-in default (the cloud API). Snippets omit the origin when
// it matches, so cloud snippets stay exactly as they always were.
const DEFAULT_API_ORIGIN = "https://www.faster-fixes.com";

/**
 * The API origin to pin in install snippets, or null when the default applies.
 * Self-hosted instances bake NEXT_PUBLIC_FF_API_ORIGIN at build time; without it
 * in the snippet, an installed widget would send feedback to the cloud API.
 */
function snippetApiOrigin(): string | null {
  const origin = process.env.NEXT_PUBLIC_FF_API_ORIGIN?.trim().replace(
    /\/+$/,
    "",
  );
  return origin && origin !== DEFAULT_API_ORIGIN ? origin : null;
}

export function buildReactLayoutSnippet(projectId: string) {
  const apiOrigin = snippetApiOrigin();
  const providerProps = `projectId="${projectId}"${
    apiOrigin ? ` apiOrigin="${apiOrigin}"` : ""
  }`;
  return `import { FeedbackProvider } from "@fasterfixes/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <FeedbackProvider ${providerProps}>
          {children}
        </FeedbackProvider>
      </body>
    </html>
  );
}`;
}

export function buildScriptEmbedSnippet(projectId: string) {
  const apiOrigin = snippetApiOrigin();
  const apiOriginAttr = apiOrigin ? ` data-api-origin="${apiOrigin}"` : "";
  return `<script src="${SCRIPT_EMBED_URL}" data-project-id="${projectId}"${apiOriginAttr} defer></script>`;
}
