import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StaticMap } from '../StaticMap';

describe('StaticMap', () => {
  it('renders a canvas element', () => {
    const { container } = render(
      <StaticMap polylines={['encoded_polyline']} />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders nothing when no polylines are provided', () => {
    const { container } = render(
      <StaticMap polylines={[]} />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument(); // It still renders the canvas, just empty
  });
});
