import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import PwaInstall from '@/components/PwaInstall';
import MobileNotificationPrompt from '@/components/MobileNotificationPrompt';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goal Pulse',
  description: 'Football fixtures, live scores and match updates, plus streaming links from Goal Pulse.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Goal Pulse',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Goal Pulse' },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-1024.png', sizes: '1024x1024', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090a10',
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <MobileNotificationPrompt />
        <PwaInstall />
        <Analytics />
      </body>
    </html>
  );
}
