// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { worker } from './App.jsx'
import './index.css'

// Start the service worker
worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})