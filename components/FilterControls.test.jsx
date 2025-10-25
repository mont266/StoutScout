import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import FilterControls from './FilterControls.jsx';
import { FilterType } from '../types.js';

// Mock the useIsDesktop hook to control the rendered component (mobile vs. desktop)
vi.mock('../hooks/useIsDesktop.js', () => ({
  __esModule: true,
  default: () => false, // Default to mobile for this test suite
}));

describe('FilterControls (Mobile)', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnFilterGuinnessZeroChange = vi.fn();

  // Helper function to render the component with default props for each test
  const setup = (props) => {
    const defaultProps = {
      currentFilter: FilterType.Distance,
      onFilterChange: mockOnFilterChange,
      onRefresh: mockOnRefresh,
      isRefreshing: false,
      filterGuinnessZero: false,
      onFilterGuinnessZeroChange: mockOnFilterGuinnessZeroChange,
    };
    render(<FilterControls {...defaultProps} {...props} />);
  };

  // Reset mocks before each test to ensure they are clean
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the current filter label correctly', () => {
    setup({ currentFilter: FilterType.Quality });
    expect(screen.getByText('Best Quality')).toBeInTheDocument();
  });

  it('calls onRefresh when the refresh button is clicked', async () => {
    const user = userEvent.setup();
    setup();
    
    const refreshButton = screen.getByRole('button', { name: /refresh pub list/i });
    await user.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('opens the filter modal when the filter button is clicked', async () => {
    const user = userEvent.setup();
    setup();

    const filterButton = screen.getByText(/sort by/i);
    await user.click(filterButton);

    // After clicking, the modal title and options should be visible
    expect(screen.getByText('Sort Pubs By')).toBeInTheDocument();
    expect(screen.getByText('Best Price')).toBeInTheDocument();
  });

  it('calls onFilterChange with the correct filter when a new option is selected in the modal', async () => {
    const user = userEvent.setup();
    setup();

    // Open the modal first
    await user.click(screen.getByText(/sort by/i));
    
    // Find and click the "Pub Score" button inside the modal
    const pubScoreButton = screen.getByRole('button', { name: /pub score/i });
    await user.click(pubScoreButton);
    
    // Verify that the callback was called with the correct value
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith(FilterType.PubScore);
  });

  it('calls onFilterGuinnessZeroChange when the 0.0 toggle is clicked in the modal', async () => {
    const user = userEvent.setup();
    setup({ filterGuinnessZero: false });

    // Open the modal
    await user.click(screen.getByText(/sort by/i));

    // Find the toggle switch (by its associated label text)
    const zeroToggle = screen.getByLabelText(/show 0.0 pubs only/i);
    await user.click(zeroToggle);

    expect(mockOnFilterGuinnessZeroChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterGuinnessZeroChange).toHaveBeenCalledWith(true);
  });
});
