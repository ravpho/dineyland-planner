import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import AboutScreen from '../../screens/AboutScreen'
import { renderWithPlanner } from '../../test/render'

test('about page credits sources, shows the data date and says the app is unofficial', () => {
  renderWithPlanner(<AboutScreen />)
  const qt = screen.getByRole('link', { name: 'Powered by Queue-Times.com' })
  expect(qt).toHaveAttribute('href', 'https://queue-times.com/en-US')
  expect(screen.getByRole('link', { name: 'ThemeParks.wiki' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Wikipedia' })).toBeInTheDocument()
  expect(screen.getByTestId('data-date')).toHaveTextContent('2026-10-04')
  expect(screen.getByTestId('unofficial')).toHaveTextContent(/unofficial/)
  expect(screen.getByTestId('unofficial')).toHaveTextContent(/not affiliated with/)
  expect(screen.getByTestId('unofficial')).toHaveTextContent(/follow the signs/)
  expect(screen.getByTestId('install-tip')).toHaveTextContent(/home screen/)
})
