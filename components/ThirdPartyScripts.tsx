'use client';

import { useEffect } from 'react';

// Third-party tags carried over from the old site's index.html:
// Google AdSense, Google Analytics, and the two Monetag tags (push + in-page push).
//
// They only load on the real domain, so visits to the Netlify preview site
// don't pollute your Analytics numbers or confuse the ad networks. After
// cutover nothing needs to change, because the real domain is already listed.
// (The Meta Pixel stays in layout.tsx exactly as before.)
const LIVE_HOSTS = ['naijatodayblog.com.ng', 'www.naijatodayblog.com.ng'];

const ADSENSE_CLIENT = 'ca-pub-1639242952745015';
const GA_ID = 'G-1K4GJFTWXC';

function addScript(attrs: Record<string, string>, inline?: string) {
  const s = document.createElement('script');
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  if (inline) s.text = inline;
  document.head.appendChild(s);
}

export default function ThirdPartyScripts() {
  useEffect(() => {
    if (!LIVE_HOSTS.includes(window.location.hostname)) return;
    const w = window as unknown as { __naijaTagsLoaded?: boolean };
    if (w.__naijaTagsLoaded) return;
    w.__naijaTagsLoaded = true;

    // Google AdSense
    addScript({
      async: '',
      src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
      crossorigin: 'anonymous',
    });

    // Google Analytics
    addScript({ async: '', src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` });
    addScript(
      {},
      `window.dataLayer = window.dataLayer || [];
       function gtag(){dataLayer.push(arguments);}
       gtag('js', new Date());
       gtag('config', '${GA_ID}');`
    );

    // Monetag push notifications
    addScript({ src: 'https://5gvci.com/act/files/tag.min.js?z=11213812', 'data-cfasync': 'false', async: '' });

    // Monetag in-page push
    const s = document.createElement('script');
    s.dataset.zone = '11213848';
    s.src = 'https://nap5k.com/tag.min.js';
    document.body.appendChild(s);
  }, []);

  return null;
}
