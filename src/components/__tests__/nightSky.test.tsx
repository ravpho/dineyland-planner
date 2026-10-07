import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NightSky } from '../NightSky'

const starsOf = (container: HTMLElement) =>
  [...container.querySelectorAll('circle')].map((c) => ['cx', 'cy', 'r', 'opacity'].map((a) => c.getAttribute(a)).join(' '))

describe('NightSky (midnight-theme design Decision 4)', () => {
  test('draws the same stars on every render', () => {
    const first = starsOf(render(<NightSky />).container)
    const second = starsOf(render(<NightSky />).container)
    expect(first.length).toBeGreaterThan(20)
    expect(second).toEqual(first)
  })

  test('is decorative: hidden from assistive technology', () => {
    const { getByTestId } = render(<NightSky />)
    expect(getByTestId('night-sky')).toHaveAttribute('aria-hidden', 'true')
  })

  test.each(['header', 'row', 'band'] as const)('the %s sky has five gold sparkles, three of which twinkle', (variant) => {
    const { getAllByTestId } = render(<NightSky variant={variant} />)
    const sparkles = getAllByTestId('sky-sparkle')
    expect(sparkles).toHaveLength(5)
    expect(sparkles.filter((s) => s.classList.contains('twinkle'))).toHaveLength(3)
  })
})
