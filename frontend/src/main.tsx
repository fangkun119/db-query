import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DatabaseWorkspace } from './components/database/database-workspace'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DatabaseWorkspace />
    </ErrorBoundary>
  </StrictMode>,
)
