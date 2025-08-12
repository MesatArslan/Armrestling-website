// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { StorageProvider } from './storage/StorageContext'

createRoot(document.getElementById('root')!).render(
  <StorageProvider>
    <App />
  </StorageProvider>,
)
