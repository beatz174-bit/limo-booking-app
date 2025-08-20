import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { CONFIG } from '@/config';

interface Props {
  apiKey?: string;
  children: ReactNode;
}

interface MapContextValue {
  /** True once the Google Maps script has loaded */
  isLoaded: boolean;
  /** Error from loading the script, if any */
  loadError?: Error;
}

const MapContext = createContext<MapContextValue>({ isLoaded: false });

// eslint-disable-next-line react-refresh/only-export-components
export function useMap() {
  return useContext(MapContext);
}

export function MapProvider({ apiKey, children }: Props) {
  const key = apiKey ?? CONFIG.GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: key ?? '',
  });

  if (!key) return <>{children}</>;

  return (
    <MapContext.Provider value={{ isLoaded, loadError: loadError as Error | undefined }}>
      {loadError ? <div>map unavailable</div> : isLoaded ? children : <div>loading...</div>}
    </MapContext.Provider>
  );
}

export default MapProvider;
