import { useState, ChangeEvent, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Container, Box, Typography, TextField, Button, Alert } from "@mui/material";

export default function LoginPage() {

  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loginWithPassword, finishOAuthIfCallback } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const onEmail = (e: ChangeEvent<HTMLInputElement>) => setEmail(e.currentTarget.value);
  const onPassword = (e: ChangeEvent<HTMLInputElement>) => setPassword(e.currentTarget.value);

  useEffect(() => {
    // only if you finish OAuth on /login; harmless otherwise
    (async () => {
      try {
        await finishOAuthIfCallback?.();
        if (/\bcode=/.test(window.location.search)) {
          const dest = params.get("from") || "/book";
          navigate(dest, { replace: true });
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // in your existing <form onSubmit=...> handler:
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // use your existing state values for email/password
      await loginWithPassword(email, password);
      const dest = params.get("from") || "/book";
      navigate(dest, { replace: true });
    } catch (err: any) {
    //   setError(err?.message || "Login failed");
    // } finally {
    //   setSubmitting(false);
    // }
      if (err instanceof Response) {
        const data = await err.json().catch(() => ({}));
        setError(data.detail ?? 'Login failed');
      } else {
        setError('Login failed');
      }
  };
}

  return (
    <Container maxWidth="sm">
      <Box component="form" onSubmit={onSubmit} sx={{ mt: 6 }}>
        <Typography variant="h4" component="h1">Log in</Typography>

        {error && <Alert severity="error" role="alert">{error}</Alert>}
        {success && <Alert severity="success" role="alert">Welcome</Alert>}

        <TextField
          label="Email"
          type="email"
          margin="normal"
          fullWidth
          value={email}
          onChange={onEmail}
        />
        <TextField
          label="Password"
          type="password"
          margin="normal"
          fullWidth
          value={password}
          onChange={onPassword}
        />
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
          Log in
        </Button>

        <Button
          fullWidth
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => navigate("/register")}
        >
          Create an Account
        </Button>
      </Box>
    </Container>
  );
}
