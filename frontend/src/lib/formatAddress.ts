export function formatAddress(addr: any): string {
  if (!addr) return "";
  const unit = addr.unit || addr.flat_number || "";
  const number = addr.house_number || "";
  const street = addr.road || addr.pedestrian || addr.path || addr.street || "";
  const suburb = addr.suburb || addr.neighbourhood || addr.town || addr.city || "";
  const postcode = addr.postcode || "";

  const unitNumber = [unit, number].filter(Boolean).join("/");
  return [unitNumber, street, suburb, postcode].filter(Boolean).join(" ").trim();
}
