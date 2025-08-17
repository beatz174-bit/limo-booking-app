import { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext'; // adjust import
import BookingPage from '@/pages/Booking/BookingPage';  // path you navigate to on success

export function renderWithProviders(ui: ReactNode, route = '/login') {
  window.history.pushState({}, 'Test', route);

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={ui} />
          <Route path="/book" element={<div>Welcome</div>} />
          {/* add other minimal routes as needed */}
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}