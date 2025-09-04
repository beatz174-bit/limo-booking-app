export interface Location {
  address: string;
  lat: number;
  lng: number;
}
export interface BookingFormData {
  pickup_when?: string;
  pickup?: Location;
  dropoff?: Location;
  passengers: number;
  notes?: string;
  pickupValid?: boolean;
  dropoffValid?: boolean;
}

