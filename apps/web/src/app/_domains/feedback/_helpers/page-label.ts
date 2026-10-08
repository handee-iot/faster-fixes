/**
 * The Feedback's page as a short label for emails: host and path, no query,
 * fragment, or protocol. "example.com/pricing", not the raw widget URL.
 */
export function pageLabel(pageUrl: string) {
  try {
    const { host, pathname } = new URL(pageUrl);
    return `${host}${pathname}`;
  } catch {
    return pageUrl;
  }
}
