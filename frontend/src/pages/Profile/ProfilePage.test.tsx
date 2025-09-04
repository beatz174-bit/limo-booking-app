import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ProfilePage from './ProfilePage';
import { setTokens } from '@/services/tokenStore';

// Mock auth context to supply token without hitting real auth logic
const ensureFreshToken = vi.fn().mockResolvedValue('test-token');
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ ensureFreshToken }),
}));

// Mock address autocomplete to avoid network activity
vi.mock('@/hooks/useAddressAutocomplete', () => ({
  useAddressAutocomplete: () => ({ suggestions: [], loading: false }),
}));

const mockFetch = (handlers: Record<string, (init?: RequestInit) => Promise<Response>>) => {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const [key, handler] of Object.entries(handlers)) {
      if (url.endsWith(key)) return handler(init);
    }
    throw new Error(`Unhandled fetch to ${url}`);
  });
};

describe('ProfilePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('submits updated profile information', async () => {
    const fetch = mockFetch({
      '/users/me': init => {
        if (init?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ full_name: 'Jane Doe' }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '111-2222',
            default_pickup_address: 'Old St',
          }),
        } as Response);
      },
      '/auth/token': () =>
        Promise.resolve({ ok: true, json: async () => ({}) } as Response),
    });
    vi.stubGlobal('fetch', fetch);
    setTokens('test-token');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<ProfilePage />);

    await screen.findByDisplayValue('John Doe');
    await screen.findByDisplayValue('111-2222');
    await userEvent.clear(screen.getByLabelText(/full name/i));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await userEvent.clear(screen.getByLabelText(/email/i));
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.clear(screen.getByLabelText(/phone/i));
    await userEvent.type(screen.getByLabelText(/phone/i), '999-8888');
    const addr = screen.getByLabelText(/default pickup address/i);
    await userEvent.clear(addr);
    await userEvent.type(addr, '123 New St');
    await userEvent.type(screen.getByLabelText(/current password/i), 'oldpw');
    await userEvent.tab();

    const newPw = screen.getByLabelText('New Password');
    await waitFor(() => expect(newPw).not.toBeDisabled());
    await userEvent.type(newPw, 'newpw');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'newpw');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    const patchCall = fetch.mock.calls.find(
      ([url, init]) =>
        typeof url === 'string' &&
        url.endsWith('/users/me') &&
        (init as RequestInit)?.method === 'PATCH',
    );
    expect(patchCall).toBeTruthy();
    const [, options] = patchCall as [string, RequestInit];
    const headers = new Headers(options.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(JSON.parse(options.body as string)).toEqual({
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '999-8888',
      default_pickup_address: '123 New St',
      password: 'newpw',
    });
    expect(setItemSpy).toHaveBeenCalledWith('userName', 'Jane Doe');
  });

  it('disables save when passwords do not match', async () => {
    const fetch = mockFetch({
      '/users/me': () =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '',
            default_pickup_address: '',
          }),
        } as Response),
      '/auth/token': () =>
        Promise.resolve({ ok: true, json: async () => ({}) } as Response),
    });
    vi.stubGlobal('fetch', fetch);

    render(<ProfilePage />);
    await screen.findByDisplayValue('John Doe');
    await userEvent.type(screen.getByLabelText(/current password/i), 'oldpw');
    await userEvent.tab();
    const newPw = screen.getByLabelText('New Password');
    await waitFor(() => expect(newPw).not.toBeDisabled());
    await userEvent.type(newPw, 'abc');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'xyz');
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('shows error when current password is invalid', async () => {
    const fetch = mockFetch({
      '/users/me': () =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '',
            default_pickup_address: '',
          }),
        } as Response),
      '/auth/token': () =>
        Promise.resolve({ ok: false, json: async () => ({}) } as Response),
    });
    vi.stubGlobal('fetch', fetch);

    render(<ProfilePage />);
    await screen.findByDisplayValue('John Doe');
    await userEvent.type(screen.getByLabelText(/current password/i), 'bad');
    await userEvent.tab();
    expect(await screen.findByText(/incorrect password/i)).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeDisabled();
  });
});
