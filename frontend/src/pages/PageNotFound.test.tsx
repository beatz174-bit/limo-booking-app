// src/pages/PageNotFound.test.tsx
import { renderWithProviders } from '../../tests/utils/renderWithProviders';
import { screen } from '@testing-library/react';
import PageNotFound from './PageNotFound';

test('shows 404 content', () => {
  renderWithProviders(<PageNotFound />, { initialPath: '/this-route-does-not-exist' });
  expect(screen.getByRole('heading', { name: /404/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
});
