import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import App from './App'
import { parseHash } from './routing'

afterEach(() => {
  window.location.hash = ''
})

describe('routing', () => {
  test.each([
    ['#/catalog', 'Catalog'],
    ['#/plan', 'Plan'],
    ['#/about', 'About'],
    ['#/import/abc', 'Import'],
    ['', 'Plan'],
  ])('%s renders the %s screen', (hash, heading) => {
    window.location.hash = hash
    render(<App />)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  test('follows hash changes', async () => {
    render(<App />)
    await act(async () => {
      window.location.hash = '#/about'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  })

  test('keeps import data', () => {
    expect(parseHash('#/import/N4Ig-xyz')).toEqual({ name: 'import', data: 'N4Ig-xyz' })
  })
})
