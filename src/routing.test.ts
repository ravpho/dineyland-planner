import { describe, expect, test } from 'vitest'
import { hrefFor, parseHash } from './routing'

describe('routes (app-shell spec: Earlier links keep working)', () => {
  test.each([
    ['#/catalog', { name: 'catalog' }],
    ['#/plan', { name: 'plan' }],
    ['#/map', { name: 'map' }],
    ['', { name: 'plan' }],
    ['#/', { name: 'plan' }],
    ['#/about', { name: 'about' }],
    ['#/import/abc', { name: 'import', data: 'abc' }],
    ['#/something-else', { name: 'plan' }],
  ])('%s', (hash, route) => {
    expect(parseHash(hash)).toEqual(route)
  })

  test('each route links back to its own address', () => {
    expect(hrefFor({ name: 'catalog' })).toBe('#/catalog')
    expect(hrefFor({ name: 'plan' })).toBe('#/plan')
    expect(hrefFor({ name: 'map' })).toBe('#/map')
  })
})
