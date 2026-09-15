import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the service worker ourselves (src/main.jsx), guarded to
      // only run over http(s) — the plugin's own default auto-injected
      // registration only checks `'serviceWorker' in navigator`, which is
      // true even under file://, so it would still attempt .register() there
      // and throw (ServiceWorker requires a secure context; file:// isn't one).
      injectRegister: false,
      manifest: {
        name: 'SCP 指令產生器 / SCP Command Generator',
        short_name: 'scp2go',
        description: '在瀏覽器端產生 scp / rsync / ssh 指令，複製到終端機執行；不上傳檔案、不連線主機。',
        lang: 'zh-Hant',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f4f5f7',
        theme_color: '#2563eb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
    // Inlines the built JS/CSS into index.html as a single file. Vite's default
    // build emits <script type="module" src="...">, which Chrome refuses to
    // fetch over file:// (CORS on the null origin) — breaking the spec's
    // "open index.html directly, no server needed" requirement. An inline
    // module with no external src/import needs no fetch, so it isn't affected.
    // Restricted to the app's own JS/CSS bundle so it can't sweep up sw.js —
    // vite-plugin-singlefile queues every .js bundle entry for deletion
    // regardless of whether it found a matching <script src> tag to inline,
    // which would otherwise silently delete the service worker file.
    viteSingleFile({ inlinePattern: ['**/index-*.js', '**/*.css'] }),
  ],
  test: {
    environment: 'node',
  },
})
