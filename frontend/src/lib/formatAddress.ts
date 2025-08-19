// Condense address component object into a readable string.
export interface AddressComponents {
  unit?: string;
  flat_number?: string;
  house_number?: string;
  road?: string;
  pedestrian?: string;
  path?: string;
  street?: string;
  suburb?: string;
  neighbourhood?: string;
  town?: string;
  city?: string;
  postcode?: string;
  [key: string]: unknown;
}

export function formatAddress(addr: AddressComponents): string {
  if (!addr) return "";
  const unit = (addr.unit || addr.flat_number || "") as string;
  const number = (addr.house_number || "") as string;
  const street = (addr.road || addr.pedestrian || addr.path || addr.street || "") as string;
  const suburb = (addr.suburb || addr.neighbourhood || addr.town || addr.city || "") as string;
  const postcode = (addr.postcode || "") as string;

  const unitNumber = [unit, number].filter(Boolean).join("/");
  return [unitNumber, street, suburb, postcode].filter(Boolean).join(" ").trim();
}
