import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography, Tooltip } from '@mui/material';
import { AddressField } from '@/components/AddressField';
import { useAuth } from '@/contexts/AuthContext';
import PushToggle from '@/components/PushToggle';
import { CONFIG } from '@/config';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';

const ProfilePage = () => {
  const { ensureFreshToken } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultPickup, setDefaultPickup] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [oldPasswordValid, setOldPasswordValid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const auto = useAddressAutocomplete(defaultPickup);

  useEffect(() => {
    const load = async () => {
      const token = await ensureFreshToken();
      if (!token) return;
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await fetch(`${base}/users/me`, {
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

  useEffect(() => {
    setOldPasswordValid(false);
    setNewPassword('');
    setConfirmPassword('');
  }, [oldPassword]);

  const verifyOldPassword = async () => {
    if (!oldPassword) return;
    try {
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await fetch(`${base}/auth/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${email}:${oldPassword}`)}`,
        },
      });
      setOldPasswordValid(res.ok);
    } catch {
      setOldPasswordValid(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await ensureFreshToken();
    const body: Record<string, unknown> = {
      full_name: fullName,
      email,
      default_pickup_address: defaultPickup,
    };
    if (newPassword && newPassword === confirmPassword && oldPasswordValid) {
      body.password = newPassword;
    }
    try {
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await fetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await ensureFreshToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      localStorage.setItem('userName', data.full_name);
    } catch {
      /* ignore */
    }
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, maxWidth: 400, m: '0 auto' }}>
      <Typography variant="h5" gutterBottom>
        My Profile
      </Typography>
      <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} margin="normal" fullWidth />
      <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} margin="normal" fullWidth />
      <AddressField
        id="defaultPickup"
        label="Default Pickup Address"
        value={defaultPickup}
        onChange={setDefaultPickup}
        suggestions={auto.suggestions}
        loading={auto.loading}
      />
      <TextField
        label="Current Password"
        type="password"
        value={oldPassword}
        onChange={e => setOldPassword(e.target.value)}
        onBlur={verifyOldPassword}
        margin="normal"
        fullWidth
        error={!!oldPassword && !oldPasswordValid}
        helperText={oldPassword && !oldPasswordValid ? 'Incorrect password' : ''}
      />
      <TextField
        label="New Password"
        type="password"
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
        margin="normal"
        fullWidth
        disabled={!oldPasswordValid}
      />
      <TextField
        label="Confirm New Password"
        type="password"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        margin="normal"
        fullWidth
        disabled={!newPassword || !oldPasswordValid}
      />
      <Tooltip title={newPassword === confirmPassword ? '' : 'new password and confirm password must match'} disableHoverListener={newPassword === confirmPassword}>
        <span>
          <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={newPassword !== confirmPassword}>
            Save
          </Button>
        </span>
      </Tooltip>
      <Box mt={4}>
        <PushToggle ensureFreshToken={ensureFreshToken} />
      </Box>
    </Box>
  );
};

export default ProfilePage;
