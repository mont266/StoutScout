import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import XPPopup from './XPPopup.jsx';

describe('XPPopup', () => {
  it('should render the confirmation message correctly', () => {
    // 1. Arrange: Render the component to the virtual screen
    render(<XPPopup />);

    // 2. Act & 3. Assert: Find the alert container first
    const alert = screen.getByRole('alert');

    // Find the message text within the alert
    const messageElement = within(alert).getByText('+1 Rating Submitted');
    expect(messageElement).toBeInTheDocument();

    // Find the icon within the alert using its class.
    // Using querySelector is an acceptable escape hatch for decorative icons that are hard to query otherwise.
    const iconElement = alert.querySelector('.fa-plus-circle');
    expect(iconElement).toBeInTheDocument();
  });
});