import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from '../renderer/App'
import '../renderer/index.css'
import { ensureWebSeed, webApi } from './webApi'

// Expose la même surface que l'app Electron (window.api), version IndexedDB.
window.api = webApi

// Service worker : rend l'app utilisable hors-ligne (essentiel à la salle).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {})
  })
}

// Seed/maj du catalogue d'exercices puis rendu.
ensureWebSeed().finally(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  )
})
