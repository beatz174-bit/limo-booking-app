import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext"
// import {  AuthApi } from '../../api-client/api';
import type { RegisterRequest } from "../../api-client/api";
// import { Configuration } from '../../api-client/configuration'
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import cfg, { AuthApi, UsersApi } from "../../components/ApiConfig"
const authApi = new AuthApi(cfg);

function RegisterPage() {
    const [email, setEmail] = useState("");
    const [full_name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { loginWithPassword } = useAuth();
    const navigate = useNavigate();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // const config = new Configuration({ basePath: "http://localhost:8000" });
        // const authApi = new AuthApi(config);

        

        const registerRequest: RegisterRequest = {
            email,
            full_name,
            password,
        };

        try {
            // Register the user
            await authApi.endpointRegisterAuthRegisterPost(registerRequest);

             // Optionally use context login to update global state
            await loginWithPassword(email, password);

            // Redirect to dashboard or desired page
            navigate("/admin");

        } catch (err: any) {
            if (err?.response?.status === 422) {
                setError("Invalid input. Please check all fields.");
            } else if (err?.response?.status === 400) {
                setError(err?.response?.data?.detail)
            } else if (err?.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Registration failed. Please try again.");
            }
            console.error("Registration error:", err);
        }
    };

    return (  <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Register
          </Typography>
    
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
    
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              label="Full Name"
              type="text"
              value={full_name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
    
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
              Register
            </Button>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => navigate("/login")}
            >
              Back to Login
            </Button>
          </Box>
        </Box>
      </Container>)
}

export default RegisterPage