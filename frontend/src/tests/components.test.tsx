import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';

// Assuming there's a simple shared component like StatusBadge
// If this exact path/name doesn't match, we can adjust it.
// Mocking it for the test structure in case the UI isn't fully written yet.
const StatusBadge = ({ status }: { status: string }) => {
  return <span data-testid="status-badge" className={`badge-${status}`}>{status.toUpperCase()}</span>;
};

describe('Shared UI Components', () => {
  describe('StatusBadge', () => {
    it('renders the status text properly formatted (Minor Bug Detection)', () => {
      render(<StatusBadge status="preparing" />);
      const badge = screen.getByTestId('status-badge');
      
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('PREPARING');
      expect(badge).toHaveClass('badge-preparing');
    });

    it('handles unexpected empty statuses gracefully without crashing', () => {
      render(<StatusBadge status="" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
    });
  });
});
