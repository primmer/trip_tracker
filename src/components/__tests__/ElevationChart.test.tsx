import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ElevationChart } from '../ElevationChart';

describe('ElevationChart', () => {
  const distance = [0, 100, 200, 300, 400, 500];
  const altitude = [100, 110, 120, 115, 105, 100];

  it('renders elevation labels in feet', () => {
    render(<ElevationChart distance={distance} altitude={altitude} />);
    
    // Max altitude: 120m -> ~393.7ft
    // Min altitude: 100m -> ~328.1ft
    expect(screen.getByText(/394/)).toBeInTheDocument();
    expect(screen.getByText(/328/)).toBeInTheDocument();
  });

  it('renders distance label in miles', () => {
    render(<ElevationChart distance={distance} altitude={altitude} />);
    
    // Max distance: 500m -> ~0.3mi
    expect(screen.getByText(/0.3 mi/)).toBeInTheDocument();
  });

  it('renders SVG elements', () => {
    const { container } = render(<ElevationChart distance={distance} altitude={altitude} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBe(2); // One for fill, one for line
  });

  it('returns null for insufficient data', () => {
    const { container } = render(<ElevationChart distance={[0]} altitude={[100]} />);
    expect(container.firstChild).toBeNull();
  });
});
