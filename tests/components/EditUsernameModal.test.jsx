import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditUsernameModal from '../../components/EditUsernameModal.jsx';

describe('EditUsernameModal', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const baseProfile = {
    username: 'OldName',
    last_username_change_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(null);
  });

  it('renders with the current username and allows typing', async () => {
    render(<EditUsernameModal userProfile={baseProfile} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByLabelText(/new username/i);
    expect(input).toHaveValue('OldName');
    
    await user.clear(input);
    await user.type(input, 'NewName');
    expect(input).toHaveValue('NewName');
  });

  it('calls onSubmit with the new username when the form is submitted', async () => {
    render(<EditUsernameModal userProfile={baseProfile} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByLabelText(/new username/i);
    await user.clear(input);
    await user.type(input, 'ValidNewName');
    
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('ValidNewName');
    });
  });

  it('displays an error for usernames that are too short', async () => {
    render(<EditUsernameModal userProfile={baseProfile} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    const input = screen.getByLabelText(/new username/i);
    
    await user.clear(input);
    await user.type(input, 'ab');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    expect(await screen.findByText('Username must be between 3 and 20 characters.')).toBeInTheDocument();
  });
  
  it('displays an error for usernames with invalid characters', async () => {
    render(<EditUsernameModal userProfile={baseProfile} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    const input = screen.getByLabelText(/new username/i);

    await user.clear(input);
    await user.type(input, 'invalid!');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // The error message from testing-library hints that the text might be broken up.
    // This flexible function-based matcher is more robust for finding the error text.
    const error = await screen.findByText((content, element) => {
      // The error message is "Username can only contain..." while the helper text is "Must be 3-20 characters..."
      // This ensures we find the error message specifically.
      return element.textContent === 'Username can only contain letters, numbers, and underscores.';
    });
    expect(error).toBeInTheDocument();
  });

  it('displays an error message from the submission function', async () => {
    mockOnSubmit.mockResolvedValue('Username is already taken.');
    
    render(<EditUsernameModal userProfile={baseProfile} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByLabelText(/new username/i);
    await user.clear(input);
    await user.type(input, 'TakenName');
    
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Username is already taken.')).toBeInTheDocument();
  });

  it('displays a cooldown message if the user changed their name recently', () => {
    const lastChangeDate = new Date();
    lastChangeDate.setDate(lastChangeDate.getDate() - 15);

    const cooldownProfile = {
      ...baseProfile,
      last_username_change_at: lastChangeDate.toISOString(),
    };
    
    render(<EditUsernameModal userProfile={cooldownProfile} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    expect(screen.getByText(/on cooldown/i)).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
