import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('Home Page', () => {
  it('renders heading', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { 
      name: /mandrake/i 
    })
    expect(heading).toBeInTheDocument()
  })
})