import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AvatarSelectionModal from '../../components/AvatarSelectionModal.jsx';
import { supabase } from '../../supabase.js';
import * as imageUtils from '../../imageUtils.js';

// Mock Supabase Storage
vi.mock('../../supabase.js', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    },
  },
}));

// Mock the image cropping utility
vi.mock('../../imageUtils.js', () => ({
  getCroppedImg: vi.fn(),
}));

describe('AvatarSelectionModal', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();
  
  const userProfile = { id: 'user123', username: 'StoutlyFan' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and allows switching between tabs', async () => {
    render(<AvatarSelectionModal userProfile={userProfile} onSelect={mockOnSelect} onClose={mockOnClose} />);
    
    expect(screen.getByLabelText(/style/i)).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /upload avatar/i }));
    expect(screen.getByText(/upload a square image/i)).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /create avatar/i }));
    expect(screen.getByLabelText(/style/i)).toBeInTheDocument();
  });

  describe('Create Avatar Tab', () => {
    it('updates the preview when style or seed is changed', async () => {
      render(<AvatarSelectionModal userProfile={userProfile} onSelect={mockOnSelect} onClose={mockOnClose} />);
      const avatarImg = screen.getByRole('img', { name: /user avatar/i });

      expect(avatarImg.src).toContain('adventurer');
      expect(avatarImg.src).toContain('StoutlyFan');
      
      await user.selectOptions(screen.getByLabelText(/style/i), 'bottts');
      expect(avatarImg.src).toContain('bottts');
      
      const seedInput = screen.getByRole('textbox', { name: /seed/i });
      await user.clear(seedInput);
      await user.type(seedInput, 'NewSeed');
      expect(avatarImg.src).toContain('NewSeed');
    });

    it('calls onSelect with the correct JSON when saved', async () => {
      render(<AvatarSelectionModal userProfile={userProfile} onSelect={mockOnSelect} onClose={mockOnClose} />);
      
      await user.selectOptions(screen.getByLabelText(/style/i), 'pixel-art');
      const seedInput = screen.getByRole('textbox', { name: /seed/i });
      await user.clear(seedInput);
      await user.type(seedInput, 'PixelHero');
      
      await user.click(screen.getByRole('button', { name: /save/i }));
      
      const expectedJson = JSON.stringify({
        type: 'dicebear',
        style: 'pixel-art',
        seed: 'PixelHero',
      });
      
      expect(mockOnSelect).toHaveBeenCalledWith(expectedJson);
    });
  });

  describe('Upload Avatar Tab', () => {
    it('opens cropper on file selection and calls onSelect with URL on save', async () => {
      const mockFile = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
      const mockCroppedFile = new File(['(⌐□_□)cropped'], 'cropped.jpeg', { type: 'image/jpeg' });
      
      vi.spyOn(imageUtils, 'getCroppedImg').mockResolvedValue(mockCroppedFile);

      supabase.storage.from('avatars').upload.mockResolvedValue({ error: null });
      supabase.storage.from('avatars').getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/avatars/user123.jpeg' }
      });

      render(<AvatarSelectionModal userProfile={userProfile} onSelect={mockOnSelect} onClose={mockOnClose} />);
      
      await user.click(screen.getByRole('button', { name: /upload avatar/i }));

      const fileInput = screen.getByLabelText(/choose a photo/i);
      await user.upload(fileInput, mockFile);
      
      expect(await screen.findByText(/frame your pint/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /save crop/i }));
      
      // With the URL.createObjectURL mock in setup, this will now pass.
      const previewImg = await screen.findByRole('img', { name: /avatar preview/i });
      expect(previewImg.src).toBe('blob:http://localhost/mock-blob-url');

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(supabase.storage.from('avatars').upload).toHaveBeenCalledWith('user123.jpeg', mockCroppedFile, { upsert: true });

        const selectCall = mockOnSelect.mock.calls[0][0];
        const parsedCall = JSON.parse(selectCall);
        expect(parsedCall.type).toBe('uploaded');
        expect(parsedCall.url).toMatch(/^https:\/\/example.com\/avatars\/user123.jpeg\?t=\d+$/);
      });
    });
  });
});
