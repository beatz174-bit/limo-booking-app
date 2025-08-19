// Displays calculated fare or loading/error states.
import { Alert, Box, CircularProgress, Typography } from "@mui/material";

export function PriceSummary(props: { price: number | null; loading?: boolean; error?: string | null }) {
  if (props.loading) return <CircularProgress size={24} />;
  if (props.error) return <Alert severity="error">{props.error}</Alert>;
  return (
    <Box>
      <Typography variant="h6">Estimated Price</Typography>
      <Typography variant="h4">{props.price !== null ? `$${props.price.toFixed(2)}` : "—"}</Typography>
    </Box>
  );
}