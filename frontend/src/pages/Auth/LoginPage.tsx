import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Container, Box, Typography, TextField, Button, Alert } from "@mui/material";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      setSuccess(true);
      // navigate("/book"); // optional: comment out if you prefer asserting success message in tests
    } catch (err: any) {
      setError("Invalid credentials");
    }
  };

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
          onChange={e => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          margin="normal"
          fullWidth
          value={password}
          onChange={e => setPassword(e.target.value)}
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
