import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Smoke test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })

  it('should render content', () => {
    render(<div>Hello World</div>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
