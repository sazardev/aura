import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/App'
import '@/styles/global.css'

const rootElement = document.querySelector('#root')

if (rootElement === null) {
  throw new Error('Root node #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
