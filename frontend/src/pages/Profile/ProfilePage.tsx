import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { CONFIG } from '@/config';

const ProfilePage = () => {
  const { ensureFreshToken } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [defaultPickup, setDefaultPickup] = useState('');

  useEffect(() => {
    const load = async () => {
      const token = await ensureFreshToken();
      if (!token) return;
      const res = await fetch(`${CONFIG.API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFullName(data.full_name || '');
        setEmail(data.email || '');
        setDefaultPickup(data.default_pickup_address || '');
      }
    };
    load();
  }, [ensureFreshToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await ensureFreshToken();
    if (!token) return;
    const body: Record<string, unknown> = {
      full_name: fullName,
      email,
      default_pickup_address: defaultPickup,
    };
    if (password) body.password = password;
    const res = await fetch(`${CONFIG.API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('userName', data.full_name);
    }
    setPassword('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, maxWidth: 400, m: '0 auto' }}>
      <Typography variant="h5" gutterBottom>
        My Profile
      </Typography>
      <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} margin="normal" fullWidth />
      <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} margin="normal" fullWidth />
      <TextField label="Default Pickup Address" value={defaultPickup} onChange={e => setDefaultPickup(e.target.value)} margin="normal" fullWidth />
      <TextField label="New Password" type="password" value={password} onChange={e => setPassword(e.target.value)} margin="normal" fullWidth />
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>
        Save
      </Button>
    </Box>
  );
};

export default ProfilePage;
