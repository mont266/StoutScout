import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PubDetails from '../components/PubDetails.jsx';

// Mock data
const mockPub = {
  id: 'osm-123',
  name: 'The Prancing Pony',
  address: '123 Hobbit Lane, Bree',
  ratings: [
    { id: 'r1', quality: 5, price: 4, user: { id: 'u1', username: 'Frodo' } },
    { id: 'r2', quality: 4, price: 3, user: { id: 'u2', username: 'Samwise' } },
  ],
  pub_score: 85,
};

const mockSession = { user: { id: 'u3' } };

const mockExistingRating = {
    id: 'r3',
    pubId: 'osm-123',
    rating: { quality: 3, price: 3 },
};

describe('PubDetails', () => {
  const mockOnLoginRequest = vi.fn();
  const mockGetAverageRating = (ratings, key) => {
    if (!ratings || ratings.length === 0) return 0;
    const total = ratings.reduce((acc, r) => acc + r[key], 0);
    return total / ratings.length;
  };

  it('renders pub name, address, and ratings correctly', () => {
    render(
      <PubDetails
        pub={mockPub}
        getAverageRating={mockGetAverageRating}
        session={null}
        userZeroVotes={new Map()}
      />
    );

    expect(screen.getByText(mockPub.name)).toBeInTheDocument();
    expect(screen.getByText(mockPub.address)).toBeInTheDocument();
    expect(screen.getByText('4.5 / 5')).toBeInTheDocument(); // Avg Quality
    expect(screen.getByText('2')).toBeInTheDocument(); // Total ratings
    expect(screen.getByText(mockPub.pub_score.toString())).toBeInTheDocument();
  });

  it('shows "Sign In" button for logged-out users', () => {
    render(
      <PubDetails
        pub={mockPub}
        getAverageRating={mockGetAverageRating}
        session={null}
        onLoginRequest={mockOnLoginRequest}
        userZeroVotes={new Map()}
      />
    );
    
    const signInButton = screen.getByRole('button', { name: /sign in or create account/i });
    expect(signInButton).toBeInTheDocument();
  });

  it('shows the rating form expanded by default for a new rating', () => {
    render(
      <PubDetails
        pub={mockPub}
        getAverageRating={mockGetAverageRating}
        session={mockSession}
        userZeroVotes={new Map()}
        // No existingUserRating, so form should be open
      />
    );
    
    // Using getByRole for fieldset/legend is more accessible and correct
    expect(screen.getByRole('group', { name: /price rating/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /quality rating/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit rating/i })).toBeInTheDocument();
  });

  it('expands the rating form when "Update Your Rating" is clicked', async () => {
    const user = userEvent.setup();
    render(
        <PubDetails
            pub={mockPub}
            getAverageRating={mockGetAverageRating}
            session={mockSession}
            userZeroVotes={new Map()}
            existingUserRating={mockExistingRating} // Provide existing rating to have form collapsed by default
        />
    );

    // Form should be collapsed initially
    expect(screen.queryByRole('group', { name: /price rating/i })).not.toBeInTheDocument();

    const updateButton = screen.getByRole('button', { name: /update your rating/i });
    await user.click(updateButton);

    // After clicking, the form elements should be visible
    expect(screen.getByRole('group', { name: /price rating/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /quality rating/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update rating/i })).toBeInTheDocument();
  });
});
