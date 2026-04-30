import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Refine } from '@refinedev/core'
import routerProvider from '@refinedev/react-router'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { dataProvider } from './providers/data-provider'
import { AppLayout } from './components/layout/app-layout'
import { DatabasesPage } from './pages/databases'
import { DatabaseDetailPage } from './pages/database-detail'
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
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/databases" replace />} />
            <Route path="/databases" element={<DatabasesPage />} />
            <Route path="/dbs/:name" element={<DatabaseDetailPage />} />
          </Routes>
        </AppLayout>
      </Refine>
    </BrowserRouter>
  </StrictMode>,
)
