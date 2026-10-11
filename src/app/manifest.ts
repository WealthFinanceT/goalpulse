import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Goal Pulse',
    short_name: 'Goal Pulse',
    description: 'Football fixtures, live scores and match updates, plus streaming links from Goal Pulse.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#040910',
    theme_color: '#0b1020',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
