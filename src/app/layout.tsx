import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';

export const viewport: Viewport = {
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'SalonFlow India — Commercial Salon Management SaaS',
  description: 'The complete salon management platform for appointments, billing, automated WhatsApp invoices, and customer loyalty.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SalonFlow',
  },
};

import { PWASplashScreen } from '@/components/pwa-splash-screen';
import { OfflineIndicator } from '@/components/offline-indicator';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { PWAUpdateBanner } from '@/components/pwa-update-banner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-body antialiased bg-slate-950 text-slate-100">
        <PWASplashScreen />
        <OfflineIndicator />
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <PWAInstallPrompt />
        <PWAUpdateBanner />
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker registration ignored:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
