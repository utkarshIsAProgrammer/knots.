/**
 * Normalizes external media URLs (e.g. from Google Images, Giphy viewer pages, etc.)
 * to direct image / GIF URLs so they can be rendered inside <img> tags reliably.
 */
export function normalizeMediaUrl(raw: string): string {
  let url = (raw || '').trim();
  if (!url) return '';

  // Data URLs and blob URLs need no transformation
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Prepend https:// if protocol is missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);

    // 1. Google Images redirect: google.com/imgres?imgurl=...
    if (parsed.hostname.includes('google.') && (parsed.pathname === '/imgres' || parsed.searchParams.has('imgurl'))) {
      const imgurl = parsed.searchParams.get('imgurl');
      if (imgurl) {
        return decodeURIComponent(imgurl);
      }
    }

    // 2. Google Search redirect: google.com/url?url=... or q=...
    if (parsed.hostname.includes('google.') && (parsed.pathname === '/url' || parsed.searchParams.has('url') || parsed.searchParams.has('q'))) {
      const target = parsed.searchParams.get('url') || parsed.searchParams.get('q');
      if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
        return decodeURIComponent(target);
      }
    }

    // 3. Giphy viewer page: giphy.com/gifs/{slug-or-name}-{id}
    if (parsed.hostname.includes('giphy.com') && parsed.pathname.includes('/gifs/')) {
      const segments = parsed.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1] || '';
      const parts = last.split('-');
      const id = parts[parts.length - 1];
      if (id && /^[a-zA-Z0-9]+$/.test(id)) {
        return `https://media.giphy.com/media/${id}/giphy.gif`;
      }
    }

    return url;
  } catch {
    return url;
  }
}

/**
 * Checks whether a string is a media image URL or data URL (e.g. animated sticker / GIF)
 */
export function isMediaReaction(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:image/') || str.startsWith('http://') || str.startsWith('https://');
}
