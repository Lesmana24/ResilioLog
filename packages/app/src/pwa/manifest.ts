import type { ManifestOptions } from 'vite-plugin-pwa';

export const pwaManifest: Partial<ManifestOptions> = {
  name: 'ResilioLog',
  short_name: 'ResilioLog',
  description: 'Offline-first disaster-relief logistics',
  theme_color: '#0f766e',
  background_color: '#ffffff',
  display: 'standalone',
  start_url: '/',
  icons: [
    {
      src: '/icons/icon-192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any',
    },
  ],
};
