// src/pages/Booking/components/DateTimeField.tsx
import { TextField } from "@mui/material";

export function DateTimeField(props: {
  id: string;
  label: string;
  value: string;
  min: string;
  onChange: (v: string) => void;
  errorText?: string;
}) {
  return (
    <TextField
      id={props.id}
      type="datetime-local"
      label={props.label}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      inputProps={{ min: props.min }}
      fullWidth
      error={!!props.errorText}
      helperText={props.errorText}
    />
  );
}