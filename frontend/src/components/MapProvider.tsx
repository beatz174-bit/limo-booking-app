import type { ReactNode } from 'react';
import { LoadScript } from '@react-google-maps/api';
import { CONFIG } from '@/config';

interface Props {
  apiKey?: string;
  children: ReactNode;
}

export function MapProvider({ apiKey, children }: Props) {
  const key = apiKey ?? CONFIG.GOOGLE_MAPS_API_KEY;
  if (!key) return <>{children}</>;
  return <LoadScript googleMapsApiKey={key}>{children}</LoadScript>;
}

export default MapProvider;
