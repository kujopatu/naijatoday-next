// Port of the original NaijaToday image watermark: Cloudinary "fetch"
// delivery with the green NaijaToday banner baked into the bottom.
const NT_WATERMARK =
  'l_text:Arial_16_bold:NaijaToday%20-%20naijatodayblog.com.ng,co_white,b_rgb:008751,g_south,y_10';
const FETCH_BASE = 'https://res.cloudinary.com/dywtb9ky3/image/fetch/';

export function toCloudinaryWm(url: string | null | undefined, width = 800, format: 'auto' | 'jpg' = 'auto'): string | undefined {
  if (!url || !url.startsWith('http')) return undefined;
  const transforms = `q_auto,f_${format},w_${width},c_limit/`;

  if (url.includes('cloudinary.com')) {
    if (url.includes('NaijaToday')) return url; // already watermarked
    if (url.includes('/upload/')) {
      // Strip any earlier transform segment, then apply ours + watermark.
      const [head, tail] = url.split('/upload/');
      const rest = tail.replace(/^(?:[a-z]_[^/]*(?:,[^/]*)*\/)+/i, '');
      return `${head}/upload/${transforms}${NT_WATERMARK}/${rest}`;
    }
    return url;
  }
  return `${FETCH_BASE}${transforms}${NT_WATERMARK}/${encodeURIComponent(url)}`;
}

// Rewrites <img src="https://..."> inside article HTML so pictures in the
// body carry the watermark too. Relative and data: URLs are left alone.
export function watermarkHtml(html: string): string {
  return html.replace(/(<img\b[^>]*?\bsrc=)(["'])(https?:\/\/[^"']+)\2/gi, (m, pre, q, src) => {
    const wm = toCloudinaryWm(src, 800);
    return wm ? `${pre}${q}${wm}${q}` : m;
  });
}
