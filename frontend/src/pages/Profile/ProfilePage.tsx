import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography, Tooltip, FormControlLabel, Switch } from '@mui/material';
import { AddressField } from '@/components/AddressField';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, authApi } from '@/components/ApiConfig';

const ProfilePage = () => {
  const { ensureFreshToken } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultPickup, setDefaultPickup] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [oldPasswordValid, setOldPasswordValid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted');

  useEffect(() => {
    const load = async () => {
      const token = await ensureFreshToken();
      if (!token) return;
      const { data } = await usersApi.apiGetMeUsersMeGet();
      setFullName(data.full_name || '');
      setEmail(data.email || '');
      setDefaultPickup(data.default_pickup_address || '');
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
      await authApi.tokenAuthTokenPost(email, oldPassword);
      setOldPasswordValid(true);
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
      const { data } = await usersApi.apiUpdateMeUsersMePatch(body);
      localStorage.setItem('userName', data.full_name);
    } catch {
      /* ignore */
    }
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleNotificationsChange = async (_e: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setNotificationsEnabled(checked);
    if (checked) {
      await initPush();
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, maxWidth: 400, m: '0 auto' }}>
      <Typography variant="h5" gutterBottom>
        My Profile
      </Typography>
      <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} margin="normal" fullWidth />
      <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} margin="normal" fullWidth />
      <AddressField id="defaultPickup" label="Default Pickup Address" value={defaultPickup} onChange={setDefaultPickup} />
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
      <FormControlLabel
        control={<Switch checked={notificationsEnabled} onChange={handleNotificationsChange} />}
        label="Enable notifications"
        sx={{ mt: 2 }}
      />
      <Tooltip title={newPassword === confirmPassword ? '' : 'new password and confirm password must match'} disableHoverListener={newPassword === confirmPassword}>
        <span>
          <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={newPassword !== confirmPassword}>
            Save
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
};

export default ProfilePage;
