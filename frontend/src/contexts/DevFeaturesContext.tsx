/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';

interface DevFeaturesContextValue {
  enabled: boolean;
  isProd: boolean;
  setEnabled: (enabled: boolean) => void;
}

const DevFeaturesContext = createContext<DevFeaturesContextValue | undefined>(undefined);

export const DevFeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const env = import.meta.env.ENV || 'development';
  const isProd = env === 'production';
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (!isProd) return true;
    return localStorage.getItem('devFeaturesEnabled') === 'true';
  });

  useEffect(() => {
    if (isProd) {
      localStorage.setItem('devFeaturesEnabled', String(enabled));
    }
  }, [enabled, isProd]);

  return (
    <DevFeaturesContext.Provider value={{ enabled, isProd, setEnabled }}>
      {children}
    </DevFeaturesContext.Provider>
  );
};

export function useDevFeatures() {
  const ctx = useContext(DevFeaturesContext);
  if (!ctx) {
    throw new Error('useDevFeatures must be used within DevFeaturesProvider');
  }
  return ctx;
}

export const DevOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { enabled } = useDevFeatures();
  return enabled ? <>{children}</> : null;
};

