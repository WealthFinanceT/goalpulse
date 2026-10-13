import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Goal Pulse',
    short_name: 'Goal Pulse',
    description: 'Football fixtures, live scores and match updates, plus streaming links from Goal Pulse.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#090a10',
    theme_color: '#090a10',
    icons: [
      { src: '/icon-192.png?v=b7d32ecd308c', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png?v=70d5dec6971f', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-1024.png?v=3c67a64317a2', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png?v=70d5dec6971f', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
