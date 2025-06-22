import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinLoginPage } from './PinLoginPage';
import { AuthProvider } from '../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import {vi , describe , it, expect, beforeEach, afterEach} from "vitest"

const mockedUsedNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as Record <string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockedUsedNavigate,
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('PinLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the PIN input and unlock button', () => {
    renderWithProviders(<PinLoginPage />);
    expect(screen.getByLabelText(/PIN:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlock Wallet/i })).toBeInTheDocument();
  });

  it('disables the unlock button if PIN is less than 6 digits and no error message is shown before submit', async () => {
    renderWithProviders(<PinLoginPage />);
    const pinInput = screen.getByLabelText(/PIN:/i);
    const unlockButton = screen.getByRole('button', { name: /Unlock Wallet/i });
    await userEvent.type(pinInput, '123'); // Type less than 6 digits
    // Button should be disabled because PIN length is not 6
    expect(unlockButton).toBeDisabled();
    // No error message should be visible yet, as submit hasn't effectively happened
    expect(screen.queryByText(/PIN must be 6 digits/i)).not.toBeInTheDocument();
    expect(mockedUsedNavigate).not.toHaveBeenCalled();
  });

  it('shows an error message for an invalid PIN after attempting submit with 6 digits', async () => {
    renderWithProviders(<PinLoginPage />);
    const pinInput = screen.getByLabelText(/PIN:/i);
    const unlockButton = screen.getByRole('button', { name: /Unlock Wallet/i });

    await userEvent.type(pinInput, '999999'); // Invalid PIN, but 6 digits to enable button
    await userEvent.click(unlockButton); // This click will now trigger handleSubmit

    // Expect button to be disabled immediately after click due to isLoading
    await waitFor(() => {
        expect(unlockButton).toBeDisabled();
        expect(screen.getByText(/Unlocking\.\.\./i)).toBeInTheDocument();
    });

    await waitFor(() => { // Wait for the async login to complete and error to appear
      expect(screen.getByText(/Invalid PIN\. Please try again\./i)).toBeInTheDocument();
      expect(screen.queryByText(/Unlocking\.\.\./i)).not.toBeInTheDocument(); // Loading text should disappear
      expect(unlockButton).not.toBeDisabled(); // Button should be enabled again after loading completes
    });
    expect(mockedUsedNavigate).not.toHaveBeenCalled();
  });

  it('redirects to /home on successful PIN login', async () => {
    renderWithProviders(<PinLoginPage />);
    const pinInput = screen.getByLabelText(/PIN:/i);
    const unlockButton = screen.getByRole('button', { name: /Unlock Wallet/i });

    await userEvent.type(pinInput, '123456'); // Correct PIN (and 6 digits to enable button)
    await userEvent.click(unlockButton);

    // Expect button to be disabled immediately after click due to isLoading
    await waitFor(() => {
        expect(unlockButton).toBeDisabled();
        expect(screen.getByText(/Unlocking\.\.\./i)).toBeInTheDocument();
    });

    await waitFor(() => { // Wait for the async login to complete and navigation
      expect(mockedUsedNavigate).toHaveBeenCalledWith('/home');
      expect(localStorage.getItem('isAuthenticated')).toBe('true');
      expect(screen.queryByText(/Unlocking\.\.\./i)).not.toBeInTheDocument();
      expect(unlockButton).not.toBeDisabled();
    });
  });

  it('disables the button while loading and re-enables it afterwards', async () => {
    renderWithProviders(<PinLoginPage />);
    const pinInput = screen.getByLabelText(/PIN:/i);
    const unlockButton = screen.getByRole('button', { name: /Unlock Wallet/i });

    await userEvent.type(pinInput, '123456'); // Type 6 digits to enable button
    userEvent.click(unlockButton); // Click the button

    // Immediately after click, expect it to be disabled and show loading text
    await waitFor(() => {
        expect(unlockButton).toBeDisabled();
        expect(screen.getByText(/Unlocking\.\.\./i)).toBeInTheDocument();
    }, { timeout: 50 }); // Small timeout to ensure state update has a chance to render

    // After async operation, expect it to be re-enabled and loading text gone
    await waitFor(() => {
      expect(unlockButton).not.toBeDisabled();
      expect(screen.queryByText(/Unlocking\.\.\./i)).not.toBeInTheDocument();
    });
  });

  it('does not allow non-numeric input', async () => {
    renderWithProviders(<PinLoginPage />);
    const pinInput = screen.getByLabelText(/PIN:/i);

    await userEvent.type(pinInput, 'abc123def');
    expect(pinInput).toHaveValue('123'); // Only '123' should be in the input
    expect(screen.getByText(/PIN must contain only digits./i)).toBeInTheDocument();
  });
});