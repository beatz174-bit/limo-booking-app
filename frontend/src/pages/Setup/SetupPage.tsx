import { useState, ChangeEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Box, Typography, TextField, Button, Alert, Switch, FormControlLabel } from "@mui/material";
import { setupApi } from "@/components/ApiConfig";
import { type SetupPayload } from "@/api-client";

export default function SetupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [accountMode, setAccountMode] = useState(false);
  const [flagfall, setFlagfall] = useState("");
  const [perKmRate, setPerKmRate] = useState("");
  const [perMinuteRate, setPerMinuteRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await setupApi.setupStatusSetupGet();
        if (res.data) {
          navigate("/login", { replace: true });
        }
      } catch {
        /* ignore */
      }
    })();
  }, [navigate]);

  const onChange = (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => setter(e.currentTarget.value);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: SetupPayload = {
        admin_email: adminEmail,
        full_name: fullName,
        admin_password: adminPassword,
        settings: {
          account_mode: accountMode,
          flagfall: parseFloat(flagfall),
          per_km_rate: parseFloat(perKmRate),
          per_minute_rate: parseFloat(perMinuteRate),
        },
      };
      const resp: unknown = await setupApi.setupSetupPost(payload);
      const redirect = (resp as { redirectTo?: string })?.redirectTo;
      navigate(redirect === "admin" ? "/admin" : "/login", { replace: true });
    } catch (err: unknown) {
      if (err instanceof Response) {
        const data = await err.json().catch(() => ({}));
        setError(data.detail ?? "Setup failed");
      } else {
        setError("Setup failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box component="form" onSubmit={onSubmit} sx={{ mt: 6 }}>
        <Typography variant="h4" component="h1">Initial Setup</Typography>

        {error && <Alert severity="error" role="alert">{error}</Alert>}

        <TextField
          label="Full Name"
          margin="normal"
          fullWidth
          value={fullName}
          onChange={onChange(setFullName)}
        />
        <TextField
          label="Email"
          type="email"
          margin="normal"
          fullWidth
          value={adminEmail}
          onChange={onChange(setAdminEmail)}
        />
        <TextField
          label="Password"
          type="password"
          margin="normal"
          fullWidth
          value={adminPassword}
          onChange={onChange(setAdminPassword)}
        />
        <FormControlLabel
          control={<Switch checked={accountMode} onChange={(_, v) => setAccountMode(v)} />}
          label="Account Mode"
        />
        <TextField
          label="Flagfall"
          type="number"
          margin="normal"
          fullWidth
          value={flagfall}
          onChange={onChange(setFlagfall)}
        />
        <TextField
          label="Per KM Rate"
          type="number"
          margin="normal"
          fullWidth
          value={perKmRate}
          onChange={onChange(setPerKmRate)}
        />
        <TextField
          label="Per Minute Rate"
          type="number"
          margin="normal"
          fullWidth
          value={perMinuteRate}
          onChange={onChange(setPerMinuteRate)}
        />
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={submitting}>
          Complete Setup
        </Button>
      </Box>
    </Container>
  );
}

