import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext"

function LoginPage() {
const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password); // ✅ call AuthContext login(email, password)
//      navigate("/"); // ✅ redirect on success
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };
    return ("Login Page")
}

export default LoginPage