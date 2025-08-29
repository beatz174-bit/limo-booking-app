// Text field with autocomplete and optional geolocation button.
import { TextField, InputAdornment, IconButton, CircularProgress, Autocomplete } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { AddressSuggestion } from "@/hooks/useAddressAutocomplete";

export function AddressField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  onUseLocation?: () => void;
  locating?: boolean;
  errorText?: string;
  suggestions: AddressSuggestion[];
  loading?: boolean;
}) {
  const adornment = props.onUseLocation ? (
    <InputAdornment position="end">
      <IconButton onClick={props.onUseLocation} edge="end" aria-label="Use my location" disabled={props.locating}>
        {props.locating ? <CircularProgress size={18} /> : <MyLocationIcon />}
      </IconButton>
    </InputAdornment>
  ) : undefined;

  return (
    <Autocomplete<AddressSuggestion>
      freeSolo
      options={props.suggestions}
      getOptionLabel={(option) => option.address}
      renderOption={(optionProps, option) => (
        <li {...optionProps} key={option.address}>
          {option.name ? `${option.name} – ${option.address}` : option.address}
        </li>
      )}
      inputValue={props.value}
      onInputChange={(_e, val) => props.onChange(val)}
      onBlur={() => props.onBlur?.(props.value)}
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
                {props.loading && <CircularProgress size={18} />}
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
