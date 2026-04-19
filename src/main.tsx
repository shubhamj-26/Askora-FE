import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

// Register service worker for Pusher Beams push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('✅ Service Worker registered:', reg.scope)
      })
      .catch((err) => {
        console.warn('⚠️ Service Worker registration failed:', err)
      })
  })
}

// Request notification permission on app startup if not already requested
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().catch(() => {
    console.warn('⚠️ Notification permission denied')
  })
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)