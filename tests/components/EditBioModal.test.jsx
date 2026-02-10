import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditBioModal from '../../components/EditBioModal.jsx';

describe('EditBioModal', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  
  const currentBio = 'This is my old bio.';

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(null); // Default success
  });

  it('renders with the current bio and allows typing', async () => {
    render(<EditBioModal currentBio={currentBio} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(currentBio);
    
    await user.clear(textarea);
    await user.type(textarea, 'This is a new bio.');
    expect(textarea).toHaveValue('This is a new bio.');
  });

  it('calls onSubmit with the new bio when the form is submitted', async () => {
    render(<EditBioModal currentBio={currentBio} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByRole('textbox');
    const newBio = 'A brand new bio for a new me.';
    await user.clear(textarea);
    await user.type(textarea, newBio);
    
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(newBio);
    });
  });

  it('updates the character counter as the user types', async () => {
    render(<EditBioModal currentBio="" onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    const textarea = screen.getByRole('textbox');
    
    expect(screen.getByText('0 / 160')).toBeInTheDocument();
    
    await user.type(textarea, 'hello world');
    
    expect(screen.getByText('11 / 160')).toBeInTheDocument();
  });

  it('displays an error message from the submission function', async () => {
    mockOnSubmit.mockResolvedValue('An unknown error occurred.');
    render(<EditBioModal currentBio={currentBio} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, ' This is a new bio.');
    
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    expect(await screen.findByText('An unknown error occurred.')).toBeInTheDocument();
  });
});
