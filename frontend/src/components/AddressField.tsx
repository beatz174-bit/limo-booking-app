// src/pages/Booking/components/AddressField.tsx
import { TextField, InputAdornment, IconButton, CircularProgress } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";

export function AddressField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  onUseLocation?: () => void;
  locating?: boolean;
  errorText?: string;
}) {
  const adornment = props.onUseLocation ? (
    <InputAdornment position="end">
      <IconButton onClick={props.onUseLocation} edge="end" aria-label="Use my location" disabled={props.locating}>
        {props.locating ? <CircularProgress size={18} /> : <MyLocationIcon />}
      </IconButton>
    </InputAdornment>
  ) : undefined;

  return (
    <TextField
      id={props.id}
      label={props.label}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={(e) => props.onBlur?.(e.target.value)}
      fullWidth
      error={!!props.errorText}
      helperText={props.errorText}
      InputProps={{ endAdornment: adornment }}
    />
  );
}