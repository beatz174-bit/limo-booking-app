// tests/utils/renderWithProviders.tsx
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '@/theme';
import React from 'react';

type Options = {
  initialPath?: string;
  /** Optional extra routes (e.g. stub pages like /admin or /login) for navigation assertions */
  extraRoutes?: React.ReactNode;
};

export function renderWithProviders(
  ui: React.ReactElement,
  { initialPath = '/', extraRoutes }: Options = {}
) {
    return render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <DevFeaturesProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <Routes>
                {/* Mount the component under test for whatever path we're on */}
                <Route path="*" element={ui} />
                {/* Optional stubs for destinations the test wants to assert */}
                {extraRoutes}
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </DevFeaturesProvider>
      </ThemeProvider>
    );
}
