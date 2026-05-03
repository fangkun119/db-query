import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { DatabaseWorkspace } from './components/database/database-workspace'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DatabaseWorkspace />
    </BrowserRouter>
  </StrictMode>,
)
