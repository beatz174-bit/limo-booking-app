import React, { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext"
// Use the SAME shared API client that RegisterPage uses so we hit the correct backend/db
// Update the path below to exactly match RegisterPage's import if different
// import { SettingsApi } from "../../api-client/api";
import config, { AuthApi, UsersApi, SettingsApi} from "@/components/ApiConfig"
import type { SettingsPayload } from "@/api-client";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";


export default function AdminDashboard() {
  // Instantiate the generated API with the SAME Configuration style used in RegisterPage
  // const basePath = import.meta.env.VITE_API_BASE_URL as string | undefined;
  // const config = new Configuration({
  //   basePath,
  //   // If RegisterPage uses accessToken in Configuration, mirror that here.
  //   // Replace with your actual token plumbed from context if needed.
  //   accessToken: () => localStorage.getItem("access_token") || "",
  // });
  const settingsApi = new SettingsApi(config);

  // Local UI state
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [accountMode, setAccountMode] = useState<boolean>(true); // true=open, false=closed
  const [googleKey, setGoogleKey] = useState("");
  const [flagfall, setFlagfall] = useState<string>("0");
  const [perKm, setPerKm] = useState<string>("0");
  const [perMinute, setPerMinute] = useState<string>("0");

  // Load settings using the generated client
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Method names depend on your generator's operationIds. Adjust if needed.
        // const res = await (settingsApi as any).getSettings?.() ?? await (settingsApi as any).settingsGet?.();
        const res = await settingsApi.apiGetSettingsSettingsGet()
        const data: SettingsPayload = (res?.data ?? res) as SettingsPayload;
        if (!mounted) return;
        setAccountMode(!!data.account_mode);
        setGoogleKey(data.google_maps_api_key ?? "");
        setFlagfall(String(data.flagfall ?? 0));
        setPerKm(String(data.per_km_rate ?? 0));
        setPerMinute(String(data.per_minute_rate ?? 0));
      } catch (err) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status !== 404 && axiosErr.code !== "ERR_CANCELED") {
          setError(
            axiosErr.response?.data
              ? `Failed to load settings (${axiosErr.response.status})`
              : axiosErr.message
          );
        }
      } finally {
        if (mounted) setInitialLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Validation helpers
  function validateNumeric(value: string): string | null {
    if (value.trim() === "") return "Required";
    const n = Number(value);
    if (Number.isNaN(n)) return "Must be a number";
    if (n < 0) return "Must be ≥ 0";
    return null;
  }

  const flagfallError = validateNumeric(flagfall);
  const perKmError = validateNumeric(perKm);
  const perMinuteError = validateNumeric(perMinute);
  const formInvalid = !!(flagfallError || perKmError || perMinuteError || !googleKey);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: SettingsPayload = {
        account_mode: accountMode,
        google_maps_api_key: googleKey,
        flagfall: Number(flagfall),
        per_km_rate: Number(perKm),
        per_minute_rate: Number(perMinute),
      };
      // Use generated client (adjust method to your generated operationId)
      // await ((settingsApi as any).updateSettings?.(payload) ?? (settingsApi as any).settingsPut?.(payload));
      await settingsApi.apiUpdateSettingsSettingsPut(payload)
      setSuccess("Settings saved");
    } catch (err) {
      const axiosErr = err as AxiosError;
      setError(
        axiosErr.response?.data
          ? `Save failed (${axiosErr.response.status})`
          : axiosErr.message
      );
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "calc(100vh - 120px)", p: 2 }}>
      <Typography variant="h4" component="h1">Admin Dashboard</Typography>
      <Card sx={{ width: "100%", maxWidth: 560 }}>
        <CardHeader
          title={<Typography variant="h5" component="h1">Global Settings</Typography>}
          subheader="Configure pricing and account behavior"
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="account-mode-label">Account Mode</InputLabel>
              <Select
                labelId="account-mode-label"
                label="Account Mode"
                value={accountMode ? "open" : "closed"}
                inputProps={{ "data-testid": "settings-account-mode" }}
                onChange={(e: SelectChangeEvent<string>) =>
                  setAccountMode(e.target.value === "open")
                }
              >
                <MenuItem value="open">Open (public registration)</MenuItem>
                <MenuItem value="closed">Closed (invite/admin only)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Google Maps API key"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              inputProps={{ "data-testid": "settings-maps-api" }}
              required
              fullWidth
              autoComplete="off"
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Flagfall"
                type="number"
                inputProps={{ step: "0.01", min: 0, "data-testid": "settings-flagfall" }}
                value={flagfall}
                onChange={(e) => setFlagfall(e.target.value)}
                error={!!flagfallError}
                helperText={flagfallError ?? "Base fee applied once per trip"}
                fullWidth
                required
              />
              <TextField
                label="Per km rate"
                type="number"
                inputProps={{ step: "0.01", min: 0,  "data-testid": "settings-per-km" }}
                value={perKm}
                onChange={(e) => setPerKm(e.target.value)}
                error={!!perKmError}
                helperText={perKmError ?? "Cost per kilometre"}
                fullWidth
                required
              />
            </Stack>

            <TextField
              label="Per minute rate"
              type="number"
              inputProps={{ step: "0.01", min: 0, "data-testid": "settings-per-minute" }}
              value={perMinute}
              onChange={(e) => setPerMinute(e.target.value)}
              error={!!perMinuteError}
              helperText={perMinuteError ?? "Cost per minute"}
              fullWidth
              required
            />

            <Box display="flex" gap={2} justifyContent="flex-end" mt={1}>
              <Button data-testid="settings-save" variant="contained" onClick={handleSave} disabled={saving || formInvalid}>
                {saving ? "Saving…" : "Save settings"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        data-testid="settings-toast-error"
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        data-testid="settings-toast-sucess"
        autoHideDuration={2000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
