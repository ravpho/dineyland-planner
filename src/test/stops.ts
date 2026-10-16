import { fireEvent, screen } from '@testing-library/react'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Opens a stop's sheet from its row, as a tap on the row does (refresh-plan-layout design Decision 6). */
export function openStop(name: string): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Open stop \\d+, ${escape(name)}$`) }))
  return screen.getByRole('dialog', { name })
}
