/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { CONFIG } from '@/config';

interface BackendReadyContextValue {
  ready: boolean;
  loading: boolean;
}

const BackendReadyContext = createContext<BackendReadyContextValue | undefined>(undefined);

export const BackendReadyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BackendReadyContextValue>({ ready: false, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/health`);
        if (!cancelled && res.ok) {
          setState({ ready: true, loading: false });
          return;
        }
      } catch {
        // ignore network errors
      }
      if (!cancelled) {
        setState((s) => ({ ...s, loading: false }));
        setTimeout(check, 1000);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BackendReadyContext.Provider value={state}>
      {children}
    </BackendReadyContext.Provider>
  );
};

export function useBackendReady() {
  return useContext(BackendReadyContext) ?? { ready: true, loading: true };
}

