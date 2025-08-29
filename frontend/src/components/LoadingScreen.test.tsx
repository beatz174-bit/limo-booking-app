import { render, screen } from '@testing-library/react';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders animated icon', () => {
    render(<LoadingScreen />);
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });
});
