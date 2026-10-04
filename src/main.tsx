import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { PlannerProvider } from './app/PlannerContext'
import { catalog } from './data'
import { createPlannerStore } from './state/store'

function deviceStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

const store = createPlannerStore(catalog, deviceStorage())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlannerProvider store={store} catalog={catalog}>
      <App />
    </PlannerProvider>
  </StrictMode>,
)
