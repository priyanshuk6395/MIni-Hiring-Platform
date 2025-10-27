// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { worker } from './api/browser.js'
import './index.css'

// Start the service worker
worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})