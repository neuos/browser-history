/**
 * Collapses redundant slashes in a URL's path, e.g. "https://example.com//favicon.ico" ->
 * "https://example.com/favicon.ico". Confirmed live: browsers' own default favicon guess for a
 * page (and, independently, some sites' own icon links) can come back with a doubled slash like
 * this, which then 404s every time it's fetched or displayed. This is external input (a raw
 * favicon URL from the browser or from another device's sync data), not our own system's data,
 * so correcting a known, narrow class of its weirdness at the point it enters this device - local
 * capture or an incoming sync event - is different from tolerating invalid data downstream.
 */
export function normalizeFaviconUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/')
    return parsed.toString()
  } catch {
    return url
  }
}
