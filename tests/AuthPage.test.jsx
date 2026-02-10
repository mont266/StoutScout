import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthPage from '../components/AuthPage.jsx';
import { supabase } from '../supabase.js';

// Mock the supabase client
vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('AuthPage', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error if signup passwords do not match', async () => {
    render(<AuthPage onClose={mockOnClose} />);
    
    // Switch to Sign Up view
    await user.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));

    // Fill out the form with mismatching passwords
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password456');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    // Assert: Check for the error message
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('shows a success message after successful signup', async () => {
    // Mock the signUp function to return a success state
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: '123' }, session: null },
      error: null,
    });
    
    render(<AuthPage onClose={mockOnClose} />);
    
    await user.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    // Assert: Check for the success message
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/we've sent a confirmation link/i)).toBeInTheDocument();
  });

  it('calls signInWithPassword on sign in attempt', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123' }, session: { access_token: 'abc' } },
      error: null,
    });
    
    render(<AuthPage onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
        });
    });
  });
});
