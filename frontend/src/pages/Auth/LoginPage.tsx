import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext"
import {  AuthApi } from '../../api-client/api';
import type { LoginRequest } from "../../api-client/api";
import { Configuration } from '../../api-client/configuration'
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
} from '@mui/material';

function LoginPage() {
      const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const config = new Configuration({ basePath: "http://localhost:8000" });
        const authApi = new AuthApi(config);

        const loginRequest: LoginRequest = {
            email,
            password,
        };

        try {
            const { data } = await authApi.loginAuthLoginPost(loginRequest);

            // Store token and user info in localStorage
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify({
                id: data.id,
                email: data.email,
                full_name: data.full_name,
                role: data.role,
                is_approved: data.is_approved,
            }));

            // Optionally call your context login method if needed
            await login(email, password);

            // Redirect or do something on success
//            navigate("/dashboard"); // adjust as needed

        } catch (err: any) {
            if (err?.response?.status === 422) {
                setError("Validation failed. Please check your email and password.");
            } else if (err?.response?.status === 401) {
                setError("Invalid credentials.");
            } else if (err?.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Login failed. Please try again.");
            }
            console.error("Login error:", err);
        }
    };
return (
  <Container maxWidth="sm">
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Login
      </Typography>

      {error && (
        <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          margin="normal"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
        >
          Log In
        </Button>
      </Box>
    </Box>
  </Container>
);

        }

export default LoginPage