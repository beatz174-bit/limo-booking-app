// Displays calculated fare or loading/error states based on user input.
import { useEffect } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { usePriceCalculator, type PriceInputs } from "@/hooks/usePriceCalculator";

export type PriceSummaryProps = PriceInputs & {
  onPrice?: (price: number | null) => void;
};

export function PriceSummary(props: PriceSummaryProps) {
  const { onPrice, ...inputs } = props;
  const { price, loading, error, compute } = usePriceCalculator({ ...inputs, auto: false });

  useEffect(() => {
    if (!inputs.pickup || !inputs.dropoff) return;
    if (typeof inputs.distanceKm !== "number" || typeof inputs.durationMin !== "number") return;
    void compute();
  }, [inputs.pickup, inputs.dropoff, inputs.rideTime, inputs.flagfall, inputs.perKm, inputs.perMin, inputs.distanceKm, inputs.durationMin, compute]);

  useEffect(() => {
    onPrice?.(price);
  }, [price, onPrice]);

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (price === null) return null;

  return (
    <Box>
      <Typography variant="h6">Estimated Price</Typography>
      <Typography variant="h4">{`$${price.toFixed(2)}`}</Typography>
    </Box>
  );
}

export default PriceSummary;
