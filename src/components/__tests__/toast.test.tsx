import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { ToastProvider, useToast } from '../Toast'
import { Sheet } from '../ui'

function Harness() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => toast('Added Big Thunder Mountain')}>
        Add
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        Open filters
      </button>
      {open && (
        <Sheet title="Filters" onClose={() => setOpen(false)}>
          <button type="button" onClick={() => toast('Filters cleared')}>
            Clear filters
          </button>
        </Sheet>
      )}
    </>
  )
}

const region = () => screen.getByTestId('toast-region')

describe('messages never cover a sheet (app-shell spec, refresh-plan-layout Decision 10)', () => {
  test('without a sheet: above the dock and the fit bar', () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByTestId('toast')).toHaveTextContent('Added Big Thunder Mountain')
    expect(region()).toHaveAttribute('data-placement', 'bottom')
    expect(region().className).toContain('bottom-[calc(var(--dock-h,0px)+0.5rem)]')
  })

  test('with a sheet open: at the top, in the band sheets leave free, and back down once it closes', () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByTestId('toast')).toHaveTextContent('Filters cleared')
    expect(region()).toHaveAttribute('data-placement', 'top')
    expect(screen.getByRole('dialog', { name: 'Filters' }).className).toContain('max-h-[calc(100dvh-5.5rem)]')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(region()).toHaveAttribute('data-placement', 'bottom')
  })
})
