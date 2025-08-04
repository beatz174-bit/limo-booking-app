// src/components/RequireSetup.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function RequireSetup() {
  const { setupRequired, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    // Only redirect if setup is required and we're not already on /setup
    if (!loading && setupRequired && pathname !== '/setup') {
      navigate('/setup', { replace: true });
    }
  }, [loading, setupRequired, pathname, navigate]);

  // While loading, or on /setup, just render children
  if (loading || setupRequired) {
    return <Outlet />;
  }

  // Once setup is complete, allow downstream routes
  return <Outlet />;
}
