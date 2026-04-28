import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Refine } from '@refinedev/core'
import routerProvider from '@refinedev/react-router'
import { BrowserRouter } from 'react-router'
import { dataProvider } from './providers/data-provider'
import { AppLayout } from './components/layout/app-layout'
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
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">DB Query Tool</h1>
            <p className="text-gray-600">Foundation ready - Phase 2 complete</p>
          </div>
        </AppLayout>
      </Refine>
    </BrowserRouter>
  </StrictMode>,
)
