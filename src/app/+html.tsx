import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import React from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering in Expo Router.
export default function Root({ children }: { children: React.ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>My Save Shop</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {/* Do not send referrer to 3rd-party CDNs (fixes Google usercontent 429 / 403 hotlinking blocks) */}
        <meta name="referrer" content="no-referrer" />

        {/* PWA Manifest and Theme */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#208AEF" />

        {/* iOS Web App Capabilities */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="My Save Shop" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />

        <ScrollViewStyleReset />

        {/* Critical: Injects react-native-web stylesheets, preload links, and JS bundle scripts */}
        {headNodes}

        {/* Service Worker and Cache Self-Healing: cleans up stale service workers, cache storage, and obsolete storage keys */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (var r of registrations) { r.unregister(); }
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (var n of names) { caches.delete(n); }
                  });
                }
                try {
                  if (window.localStorage) {
                    var u = window.localStorage.getItem('@saveshop_api_url');
                    if (u && (u.indexOf('trycloudflare.com') !== -1 || u.indexOf('192.168.29.252') !== -1 || u.indexOf('chamber-golf') !== -1)) {
                      window.localStorage.removeItem('@saveshop_api_url');
                    }
                    var s = window.localStorage.getItem('@saveshop_active_store');
                    if (s && s.indexOf('9300791a-52eb-49ce-a4cb-5983d34374e0') !== -1) {
                      window.localStorage.removeItem('@saveshop_active_store');
                    }
                  }
                } catch(e) {}
              }
            `,
          }}
        />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
