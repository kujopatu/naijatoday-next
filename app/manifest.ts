import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NaijaToday',
    short_name: 'NaijaToday',
    description: "Nigeria's most trusted digital media platform",
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1117',
    theme_color: '#008751',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
