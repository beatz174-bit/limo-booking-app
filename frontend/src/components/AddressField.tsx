// src/pages/Booking/components/AddressField.tsx
import { TextField, InputAdornment, IconButton, CircularProgress, Autocomplete } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";

export function AddressField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
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

  const { suggestions, loading } = useAddressAutocomplete(props.value);

  return (
    <Autocomplete
      freeSolo
      options={suggestions.map((s) => s.display)}
      inputValue={props.value}
      onInputChange={(_e, val) => props.onChange(val)}
      renderInput={(params) => (
        <TextField
          {...params}
          id={props.id}
          label={props.label}
          fullWidth
          error={!!props.errorText}
          helperText={props.errorText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress size={18} />}
                {adornment}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}