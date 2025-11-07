import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'The Stream Cult - Token-Driven Live Streaming Platform',
  description: 'Experience the future of live streaming with token-based tipping, real-time interactions, and community-driven content across multiple categories.',
  keywords: 'livestream, streaming, tokens, tipping, gaming, music, tech, entertainment',
  authors: [{ name: 'Electric Sunshine Cult' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#8B5CF6',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thestreamcult.com',
    siteName: 'The Stream Cult',
    title: 'The Stream Cult - Token-Driven Live Streaming Platform',
    description: 'Experience the future of live streaming with token-based tipping, real-time interactions, and community-driven content.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'The Stream Cult Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Stream Cult - Token-Driven Live Streaming Platform',
    description: 'Experience the future of live streaming with token-based tipping, real-time interactions, and community-driven content.',
    images: ['/og-image.jpg'],
    creator: '@thestreamcult',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <Providers>
          <div className="flex h-full flex-col">
            {children}
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'text-sm',
              style: {
                background: '#fff',
                color: '#1e293b',
                border: '1px solid #e2e8f0',
              },
              success: {
                style: {
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                },
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#f0fdf4',
                },
              },
              error: {
                style: {
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                },
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fef2f2',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}