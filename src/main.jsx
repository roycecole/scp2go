import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { loadFontsIfFastEnough } from './lib/fonts.js'
import './styles/theme.css'
import './styles/global.css'

loadFontsIfFastEnough()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Service workers require a secure context — file:// doesn't qualify, so the
// app stays fully usable there (per the spec's "open index.html directly"
// requirement) just without PWA/offline features, which don't apply to an
// already-local file anyway.
if (location.protocol.startsWith('http')) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
