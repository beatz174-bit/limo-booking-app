import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import * as logger from '@/lib/logger';
import { AddressField } from '@/components/AddressField';
import { useAuth } from '@/contexts/AuthContext';
import PushToggle from '@/components/PushToggle';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';

const stripePromise = (async () => {
  try {
    return await loadStripe(
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
    );
  } catch (err) {
    logger.warn('pages/Profile/ProfilePage', 'Stripe init failed', err);
    return null;
  }
})();

const ProfilePage = () => {
  const { ensureFreshToken } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultPickup, setDefaultPickup] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [oldPasswordValid, setOldPasswordValid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<{ brand: string; last4: string } | null>(null);
  const [editingCard, setEditingCard] = useState(false);

  const auto = useAddressAutocomplete(defaultPickup);
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    const load = async () => {
      const token = await ensureFreshToken();
      if (!token) return;
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await apiFetch(`${base}/users/me`);
      if (res.ok) {
        const data = await res.json();
        setFullName(data.full_name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setDefaultPickup(data.default_pickup_address || '');
      }
      try {
        const pmRes = await apiFetch(`${base}/users/me/payment-method`);
        if (pmRes.ok) {
          const pmJson = await pmRes.json();
          if (pmJson && pmJson.last4) {
            setPaymentMethod({ brand: pmJson.brand, last4: pmJson.last4 });
          }
        }
      } catch {
        /* ignore */
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
      const res = await apiFetch(`${base}/auth/token`, {
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
      phone,
      default_pickup_address: defaultPickup,
    };
    if (phone) {
      body.phone = phone;
    }
    if (newPassword && newPassword === confirmPassword && oldPasswordValid) {
      body.password = newPassword;
    }
    try {
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
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

  const handleSaveCard = async () => {
    if (!stripe || !elements) return;
    await ensureFreshToken();
    try {
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await apiFetch(`${base}/users/me/payment-method`, {
        method: 'POST',
      });
      if (!res.ok) return;
      const json = await res.json();
      const card = elements.getElement(CardElement);
      if (!json.client_secret || !card) return;
      const setup = await stripe.confirmCardSetup(json.client_secret, {
        payment_method: { card },
      });
      const pm = setup?.setupIntent?.payment_method;
      if (pm) {
        await apiFetch(`${base}/users/me/payment-method`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_method_id: pm }),
        });
        setEditingCard(false);
        const pmRes = await apiFetch(`${base}/users/me/payment-method`);
        if (pmRes.ok) {
          try {
            const meta = await pmRes.json();
            if (meta && meta.last4) {
              setPaymentMethod({ brand: meta.brand, last4: meta.last4 });
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      logger.warn('pages/Profile/ProfilePage', 'save card failed', err);
    }
  };

  const handleRemoveCard = async () => {
    await ensureFreshToken();
    try {
      const base = CONFIG.API_BASE_URL ?? '';
      await apiFetch(`${base}/users/me/payment-method`, { method: 'DELETE' });
      setPaymentMethod(null);
    } catch {
      /* ignore */
    }
  };

  return (
    <Elements stripe={stripePromise}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: 2, maxWidth: 400, m: '0 auto' }}
      >
      <Typography variant="h5" gutterBottom>
        My Profile
      </Typography>
      <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} margin="normal" fullWidth />
      <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} margin="normal" fullWidth />
      <TextField label="Phone" value={phone} onChange={e => setPhone(e.target.value)} margin="normal" fullWidth />
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
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Payment Method
        </Typography>
        {paymentMethod && !editingCard ? (
          <Stack spacing={1}>
            <Typography>
              {paymentMethod.brand} ending in {paymentMethod.last4}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button type="button" onClick={() => setEditingCard(true)}>
                Replace
              </Button>
              <Button type="button" onClick={handleRemoveCard}>
                Remove
              </Button>
            </Stack>
          </Stack>
        ) : editingCard ? (
          <Stack spacing={1}>
            <CardElement />
            <Stack direction="row" spacing={1}>
              <Button
                type="button"
                variant="contained"
                onClick={handleSaveCard}
              >
                Save Card
              </Button>
              <Button type="button" onClick={() => setEditingCard(false)}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Button
            type="button"
            variant="contained"
            onClick={() => setEditingCard(true)}
          >
            Add Card
          </Button>
        )}
      </Box>
    </Box>
    </Elements>
  );
};

export default ProfilePage;
