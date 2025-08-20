// Displays a simple fare calculation breakdown (development only).
import { Box, Typography } from '@mui/material';
import { useDevFeatures } from '@/contexts/DevFeaturesContext';

interface Props {
  price: number | null;
  flagfall: number;
  perKm: number;
  perMin: number;
  distanceKm?: number;
  durationMin?: number;
}

export function FareBreakdown({ price, flagfall, perKm, perMin, distanceKm = 0, durationMin = 0 }: Props) {
  const { enabled } = useDevFeatures();
  if (!enabled) return null;

  const distanceCost = distanceKm * perKm;
  const durationCost = durationMin * perMin;
  const total = price ?? flagfall + distanceCost + durationCost;

  return (
    <Box mt={2}>
      <Typography variant="h6">Fare Breakdown</Typography>
      <Typography variant="body2">Flagfall: ${flagfall.toFixed(2)}</Typography>
      <Typography variant="body2">Distance: {distanceKm.toFixed(0)} km @ ${perKm} per km = ${distanceCost.toFixed(2)}</Typography>
      <Typography variant="body2">Duration: {durationMin.toFixed(0)} minutes @ ${perMin} per minute = ${durationCost.toFixed(2)}</Typography>
      <Typography variant="body2">Total: ${flagfall} + ${distanceCost.toFixed(2)} + ${durationCost.toFixed(2)} = ${total.toFixed(2)}</Typography>
    </Box>
  );
}

export default FareBreakdown;
