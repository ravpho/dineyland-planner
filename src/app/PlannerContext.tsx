import { createContext, useContext, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { Catalog } from '../domain/catalog'
import type { PlannerState, PlannerStore } from '../state/store'

interface PlannerContextValue {
  store: PlannerStore
  catalog: Catalog
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

export function PlannerProvider({ store, catalog, children }: PlannerContextValue & { children: ReactNode }) {
  return <PlannerContext.Provider value={{ store, catalog }}>{children}</PlannerContext.Provider>
}

function useContextValue(): PlannerContextValue {
  const value = useContext(PlannerContext)
  if (!value) throw new Error('PlannerProvider is missing')
  return value
}

export function usePlanner<T>(selector: (state: PlannerState) => T): T {
  return useStore(useContextValue().store, selector)
}

export function useCatalog(): Catalog {
  return useContextValue().catalog
}

export function usePlannerStore(): PlannerStore {
  return useContextValue().store
}
