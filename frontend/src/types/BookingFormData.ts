export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface BookingFormData {
  pickup_when?: string;
  pickup?: Location;
  dropoff?: Location;
  passengers: number;
  notes?: string;
  customer?: CustomerInfo;
  pickupValid?: boolean;
  dropoffValid?: boolean;
}

