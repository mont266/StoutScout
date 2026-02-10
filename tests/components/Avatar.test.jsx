import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Avatar from '../../components/Avatar.jsx';

describe('Avatar', () => {
  it('renders the fallback icon when avatarId is null', () => {
    const { container } = render(<Avatar avatarId={null} />);
    // An `<i>` tag is presentational and has no role. Querying by class is a valid escape hatch.
    expect(container.querySelector('.fa-user')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders the fallback icon when avatarId is an invalid JSON string', () => {
    const { container } = render(<Avatar avatarId="not-json" />);
    expect(container.querySelector('.fa-user')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders a Dicebear avatar correctly', () => {
    const dicebearId = JSON.stringify({
      type: 'dicebear',
      style: 'adventurer',
      seed: 'TestSeed',
    });
    render(<Avatar avatarId={dicebearId} />);
    
    const img = screen.getByRole('img', { name: /user avatar/i });
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('https://api.dicebear.com/8.x/adventurer/svg?seed=TestSeed');
  });

  it('renders an uploaded avatar correctly', () => {
    const uploadedId = JSON.stringify({
      type: 'uploaded',
      url: 'https://example.com/avatar.png',
    });
    render(<Avatar avatarId={uploadedId} />);
    
    const img = screen.getByRole('img', { name: /user avatar/i });
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://example.com/avatar.png');
  });
});
