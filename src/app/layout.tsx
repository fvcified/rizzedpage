import type { Metadata, Viewport } from 'next'
import './style.css'

export const viewport: Viewport = {
  themeColor: '#010101',
}

export const metadata: Metadata = {
  title: 'rizzed',
  description: 'Mine @ .//fvkid.xyz/',
  keywords: 'fvkid',
  authors: [{ name: 'Xiao' }],
  icons: {
    icon: '/images/UK-FLAG.webp',    
    shortcut: '/images/UK-FLAG.webp',    
    apple: '/images/UK-FLAG.webp',      
  },
  openGraph: {
    title: 'fvkid.site',
    description: 'Mine @ .//fvkid.xyz/',
    url: 'https://fvkid.xyz/',
    images: ['https://fvkid.xyz/images/thumbnail.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'fvkid',
    description: 'Mine @ .//fvkid.xyz/',
    images: ['https://fvkid.xyz/images/thumbnail.webp'],
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