/** Extract share token from HTTPS or custom-scheme deep links. */
export function parseShareTokenFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'ebusinesscard:') {
      if (parsed.hostname === 'c') {
        const token = parsed.pathname.replace(/^\/+/, '');
        return token ? decodeURIComponent(token) : null;
      }
      const path = parsed.pathname.replace(/^\/+/, '');
      if (path.startsWith('c/')) {
        return decodeURIComponent(path.slice(2)) || null;
      }
      if (path.startsWith('share/')) {
        return decodeURIComponent(path.slice(6)) || null;
      }
      return path ? decodeURIComponent(path) : null;
    }

    const match = parsed.pathname.match(/^\/c\/([^/?#]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    const fallback = trimmed.match(/\/c\/([^/?#]+)/);
    if (fallback?.[1]) {
      return decodeURIComponent(fallback[1]);
    }
  }

  return null;
}
