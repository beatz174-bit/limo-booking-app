/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';

interface BackendReadyContextValue {
  ready: boolean;
  loading: boolean;
  needsSetup: boolean;
  refresh: () => Promise<void>;
}

const BackendReadyContext = createContext<BackendReadyContextValue | undefined>(undefined);

export const BackendReadyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState({ ready: false, loading: true, needsSetup: false });

  const check = useCallback(async () => {
    try {
      const res = await apiFetch(`${CONFIG.API_BASE_URL}/health`);
      if (res.ok) {
        try {
          const setupRes = await apiFetch(`${CONFIG.API_BASE_URL}/setup`);
          let needsSetup = true;
          if (setupRes.ok) {
            const data = await setupRes.json().catch(() => null);
            needsSetup = !data;
          }
          setState({ ready: true, loading: false, needsSetup });
          return;
        } catch {
          setState({ ready: true, loading: false, needsSetup: true });
          return;
        }
      }
    } catch {
      // ignore
    }
    setState({ ready: false, loading: true, needsSetup: false });
    setTimeout(check, 1000);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <BackendReadyContext.Provider value={{ ...state, refresh: check }}>
      {children}
    </BackendReadyContext.Provider>
  );
};

export function useBackendReady() {
  return (
    useContext(BackendReadyContext) ?? {
      ready: true,
      loading: true,
      needsSetup: false,
      refresh: async () => {},
    }
  );
}

