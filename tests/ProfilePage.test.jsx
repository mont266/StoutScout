import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProfilePage from '../components/ProfilePage.jsx';
import { OnlineStatusContext } from '../contexts/OnlineStatusContext.jsx';

// Mock data
const mockUserProfile = {
  id: 'user123',
  username: 'GuinnessGuru',
  level: 5,
  reviews: 2,
  avatar_id: JSON.stringify({ type: 'dicebear', style: 'miniavs', seed: 'GuinnessGuru' }),
  friends_count: 3,
};

const mockUserRatings = [
  { id: 'r1', pubId: 'p1', pubName: 'The Rusty Flagon', pubAddress: '1 Dock Street', rating: { quality: 5, price: 4 }, timestamp: Date.now() },
  { id: 'r2', pubId: 'p2', pubName: 'The Gilded Mug', pubAddress: '2 Market Square', rating: { quality: 4, price: 3 }, timestamp: Date.now() - 100000 },
];

describe('ProfilePage', () => {
  const mockOnViewPub = vi.fn();
  const mockLevelRequirements = [
    { level: 1, total_ratings_required: 0 },
    { level: 2, total_ratings_required: 2 },
    { level: 3, total_ratings_required: 5 },
    { level: 4, total_ratings_required: 10 },
    { level: 5, total_ratings_required: 15 },
    { level: 6, total_ratings_required: 25 },
  ];

  const renderWithContext = (component) => {
    return render(
        <OnlineStatusContext.Provider value={{ onlineUserIds: new Set() }}>
            {component}
        </OnlineStatusContext.Provider>
    );
  };
  
  it('renders the user profile information correctly', () => {
    renderWithContext(
      <ProfilePage
        userProfile={mockUserProfile}
        userRatings={mockUserRatings}
        onViewPub={mockOnViewPub}
        loggedInUserProfile={mockUserProfile}
        levelRequirements={mockLevelRequirements}
      />
    );
    
    // Check for username, level, rank, etc.
    expect(screen.getByText(mockUserProfile.username)).toBeInTheDocument();
    expect(screen.getByText(mockUserProfile.level.toString())).toBeInTheDocument();
    expect(screen.getByText('Pint Pilgrim')).toBeInTheDocument(); // Rank for level 5
    expect(screen.getByText(mockUserProfile.reviews.toString())).toBeInTheDocument();
    expect(screen.getByText(mockUserProfile.friends_count.toString())).toBeInTheDocument();
  });

  it('renders the list of user ratings', () => {
    renderWithContext(
      <ProfilePage
        userProfile={mockUserProfile}
        userRatings={mockUserRatings}
        onViewPub={mockOnViewPub}
        loggedInUserProfile={mockUserProfile}
        levelRequirements={mockLevelRequirements}
      />
    );

    // Check that both ratings are displayed by their pub names
    expect(screen.getByText('The Rusty Flagon')).toBeInTheDocument();
    expect(screen.getByText('The Gilded Mug')).toBeInTheDocument();

    // Check for rating stars within one of the rating cards
    const rustyFlagonCard = screen.getByText('The Rusty Flagon').closest('li');
    const qualityStars = within(rustyFlagonCard).getAllByText((content, element) => {
        return element.tagName.toLowerCase() === 'i' && element.classList.contains('fa-star');
    });
    // Expect 5 for quality + 5 for price = 10 star icons
    expect(qualityStars).toHaveLength(10);
  });
});
