// Text field with autocomplete and optional geolocation button.
import { useEffect } from "react";
import { TextField, InputAdornment, IconButton, CircularProgress, Autocomplete } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import * as logger from "@/lib/logger";
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
  useEffect(() => {
    if (props.errorText) {
      logger.warn("components/AddressField", "Error text", props.errorText);
    }
  }, [props.errorText]);

  const adornment = props.onUseLocation ? (
    <InputAdornment position="end">
      <IconButton
        onClick={() => {
          logger.debug("components/AddressField", "Use location clicked");
          props.onUseLocation?.();
        }}
        edge="end"
        aria-label="Use my location"
        disabled={props.locating}
      >
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
      onInputChange={(_e, val) => {
        logger.debug("components/AddressField", "Input change", val);
        props.onChange(val);
      }}
      onBlur={() => {
        logger.debug("components/AddressField", "Blur", props.value);
        props.onBlur?.(props.value);
      }}
      onChange={(_e, val) => {
        if (val) {
          logger.info("components/AddressField", "Suggestion selected", val);
          if (typeof val === "string") {
            props.onChange(val);
          } else {
            props.onChange(val.address);
          }
        }
      }}
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
