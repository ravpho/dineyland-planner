import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { PlannerProvider } from '../app/PlannerContext'
import type { Catalog } from '../domain/catalog'
import { createPlannerStore, type PlannerStore } from '../state/store'
import { sampleCatalog } from './sampleCatalog'

export function renderWithPlanner(ui: ReactElement, options: { catalog?: Catalog; store?: PlannerStore } = {}) {
  const catalog = options.catalog ?? sampleCatalog
  const store = options.store ?? createPlannerStore(catalog)
  return { store, ...render(<PlannerProvider store={store} catalog={catalog}>{ui}</PlannerProvider>) }
}
