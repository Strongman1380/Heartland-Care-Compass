import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/contexts/ThemeProvider';

// Simple test component
const TestComponent = () => <div>Test Content</div>;

describe('Basic Tests', () => {
  it('should render content', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
