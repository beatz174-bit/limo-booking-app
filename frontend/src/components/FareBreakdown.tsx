import { Box, Typography } from "@mui/material";

export interface FareBreakdownProps {
  flagfall: number;
  perKm: number;
  perMin: number;
  distanceKm?: number;
  durationMin?: number;
}

export function FareBreakdown({
  flagfall,
  perKm,
  perMin,
  distanceKm,
  durationMin,
}: FareBreakdownProps) {
  const dist = distanceKm ?? 0;
  const dur = durationMin ?? 0;

  return (
    <Box mt={2}>
      <Typography variant="subtitle1">Fare Breakdown</Typography>
      <Typography>flagfall: ${flagfall.toFixed(2)}</Typography>
      <Typography>
        {dist.toFixed(2)} km x ${perKm.toFixed(2)}
      </Typography>
      <Typography>
        {dur.toFixed(2)} min x ${perMin.toFixed(2)}
      </Typography>
    </Box>
  );
}
