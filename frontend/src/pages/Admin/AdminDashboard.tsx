import React, { useEffect, useState } from "react";
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import type { SettingsPayload } from "@/api-client";
import { useDevFeatures } from '@/contexts/DevFeaturesContext';
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
  FormControlLabel,
  Checkbox,
  Tooltip,
} from "@mui/material";


export default function AdminDashboard() {
  const { enabled: devEnabled, setEnabled: setDevEnabled, isProd } = useDevFeatures();

  // Local UI state
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [accountMode, setAccountMode] = useState<boolean>(true); // true=open, false=closed
  const [flagfall, setFlagfall] = useState<string>("0");
  const [perKm, setPerKm] = useState<string>("0");
  const [perMinute, setPerMinute] = useState<string>("0");

  // Load settings
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch(`${CONFIG.API_BASE_URL}/settings`);
        if (!res.ok) {
          if (res.status !== 404) {
            throw new Error(`Failed to load settings (${res.status})`);
          }
          return;
        }
        if (!mounted) return;
        const payload = (await res.json()) as SettingsPayload;
        setAccountMode(!!payload.account_mode);
        setFlagfall(String(payload.flagfall ?? 0));
        setPerKm(String(payload.per_km_rate ?? 0));
        setPerMinute(String(payload.per_minute_rate ?? 0));
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
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
  const formInvalid = !!(flagfallError || perKmError || perMinuteError);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: SettingsPayload = {
        account_mode: accountMode,
        flagfall: Number(flagfall),
        per_km_rate: Number(perKm),
        per_minute_rate: Number(perMinute),
      };
      const res = await apiFetch(`${CONFIG.API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Save failed (${res.status})`);
      }
      setSuccess("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
            <Tooltip title={!isProd ? 'In development mode; switch to production to toggle' : ''}>
              <span>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={devEnabled}
                      onChange={(e) => setDevEnabled(e.target.checked)}
                      disabled={!isProd}
                    />
                  }
                  label="Enable development features"
                />
              </span>
            </Tooltip>
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

