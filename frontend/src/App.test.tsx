import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock the canvas/window alerts so they don't break the test runner
window.alert = vi.fn();

describe('MySkinSpec Frontend Workflows', () => {

  
  // TEST ID 2: Protected Route Interception (Expected: PASS)
  it('ID2: Blocks unauthenticated users from accessing premium views', () => {
    // Clear local storage to simulate a logged-out guest user
    localStorage.clear();
    
    render(<App />);
    
    // Simulate clicking the locked "Ingredient Analyser" nav button
    const analyserButton = screen.getByText('Ingredient Analyser');
    fireEvent.click(analyserButton);
    
    // Assert that the window alert was triggered to warn the user
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Please sign in'));
    
    // Assert that they were redirected to the profile/login page (Unlock your skin profile)
    expect(screen.getByText('Unlock your skin profile.')).toBeDefined();
  });

  // TEST ID 5: Dynamic Sensitivity Warning (Expected: FAIL)
  it('ID5: UI renders dynamic sensitivity warnings (INTENTIONAL FAIL)', () => {
    render(<App />);
    
    // We intentionally assert that a specific red warning box exists on the home screen.
    // Because the warning only appears IN THE CHATBOT after AI generation, 
    // it will not be found on the Home screen, causing this UI test to fail!
    const warningElement = screen.queryByText('⚠️ Note: Since you have sensitive skin');
    
    // This assertion will fail because the element is null
    expect(warningElement).not.toBeNull(); 
  });

});