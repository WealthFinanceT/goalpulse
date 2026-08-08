import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goal Pulse',
  description: 'A simple football fixtures website powered by Streamed API.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
