import type { Metadata, Viewport } from 'next'
import './style.css'

export const viewport: Viewport = {
  themeColor: '#6E0F1A',
}

export const metadata: Metadata = {
  title: 'rizzedpage',
  description: 'A rizzed kid',
  authors: [{ name: 'Xiao Xli' }],
  keywords: ['fvkid', 'rizzed'],
  metadataBase: new URL('https://qwertyu.is-a.dev/'),
  openGraph: {
    title: 'rizzed page',
    description: 'A rizzed kid',
    url: 'https://qwertyu.is-a.dev/',
    siteName: 'fvkid.xyz',
    images: [
      {
        url: '/images/thumbnail.webp',
        width: 1200,
        height: 630,
        alt: 'rizzed page',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'rizzed page',
    description: 'A rizzed kid',
    images: ['/images/thumbnail.webp'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link id="dynamic-favicon" rel="shortcut icon" href="/images/flags/UK-FLAG.webp" type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}