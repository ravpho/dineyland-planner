import { useEffect, useState } from 'react'

/** `catalog` is Explore and `plan` is My day: earlier links keep working (refresh-plan-layout design Decision 1). */
export type Route =
  | { name: 'catalog' }
  | { name: 'plan' }
  | { name: 'map' }
  | { name: 'about' }
  | { name: 'import'; data: string }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  if (path.startsWith('import/')) return { name: 'import', data: path.slice('import/'.length) }
  if (path === 'catalog') return { name: 'catalog' }
  if (path === 'map') return { name: 'map' }
  if (path === 'about') return { name: 'about' }
  return { name: 'plan' }
}

export function hrefFor(route: Route): string {
  return route.name === 'import' ? `#/import/${route.data}` : `#/${route.name}`
}

export function navigate(route: Route) {
  window.location.hash = hrefFor(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
