import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Refine } from '@refinedev/core'
import routerProvider from '@refinedev/react-router'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { dataProvider } from './providers/data-provider'
import { DatabaseWorkspace } from './components/database/database-workspace'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Refine
        dataProvider={dataProvider}
        routerProvider={routerProvider}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/databases" replace />} />
          <Route path="/databases" element={<DatabaseWorkspace />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  </StrictMode>,
)
