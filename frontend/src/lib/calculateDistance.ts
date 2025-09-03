export interface LatLng {
  lat: number;
  lng: number;
}

export function calculateDistance(
  pos: LatLng,
  nextStop: LatLng,
  g?: typeof google,
): number {
  const compute = g?.maps?.geometry?.spherical?.computeDistanceBetween;
  if (compute) {
    return compute(
      new g.maps.LatLng(pos.lat, pos.lng),
      new g.maps.LatLng(nextStop.lat, nextStop.lng),
    );
  }
  const R = 6371e3;
  const phi1 = (pos.lat * Math.PI) / 180;
  const phi2 = (nextStop.lat * Math.PI) / 180;
  const dphi = ((nextStop.lat - pos.lat) * Math.PI) / 180;
  const dlambda = ((nextStop.lng - pos.lng) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
