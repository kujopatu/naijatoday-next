import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NaijaToday',
    short_name: 'NaijaToday',
    description: "Nigerian news, politics, business, sports, entertainment, jobs and scholarships.",
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
