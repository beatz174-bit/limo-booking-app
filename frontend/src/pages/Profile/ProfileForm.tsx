import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Tooltip,
  Stack,
  Alert,
} from '@mui/material';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import * as logger from '@/lib/logger';
import { AddressField } from '@/components/AddressField';
import { useAuth } from '@/contexts/AuthContext';
import PushToggle from '@/components/PushToggle';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';

const ProfileForm = () => {
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
  const [cardError, setCardError] = useState<string | null>(null);

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
    setCardError(null);
    try {
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await apiFetch(`${base}/users/me/payment-method`, {
        method: 'POST',
      });
      if (!res.ok) {
        logger.warn('pages/Profile/ProfileForm', 'setup intent request failed', res.status);
        setCardError('Failed to initiate card setup.');
        return;
      }
      const json = await res.json();
      logger.info(
        'pages/Profile/ProfileForm',
        'setup-intent response',
        json,
      );
      const card = elements.getElement(CardElement);
      if (!json.setup_intent_client_secret || !card) return;
      const setup = await stripe.confirmCardSetup(json.setup_intent_client_secret, {
        payment_method: { card },
      });
      logger.info(
        'pages/Profile/ProfileForm',
        'confirmCardSetup result',
        setup,
      );
      const pm = setup?.setupIntent?.payment_method;
      if (!pm) {
        const message = setup?.error?.message || 'Failed to confirm card.';
        logger.warn('pages/Profile/ProfileForm', 'save card failed', message);
        setCardError(message);
        return;
      }
      const putRes = await apiFetch(`${base}/users/me/payment-method`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: pm }),
      });
      if (!putRes.ok) {
        const text = await putRes.text().catch(() => '');
        logger.warn('pages/Profile/ProfileForm', 'save card failed', { status: putRes.status, body: text });
        setCardError('Failed to save payment method.');
        return;
      }
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
    } catch (err) {
      logger.warn('pages/Profile/ProfileForm', 'save card failed', err);
      setCardError('Failed to save payment method.');
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
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ p: 2, maxWidth: 400, m: '0 auto' }}
    >
      <Typography variant="h5" gutterBottom>
        My Profile
      </Typography>
      {(!phone || !paymentMethod) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please add your
          {!phone ? ' phone number' : ''}
          {!phone && !paymentMethod ? ' and' : ''}
          {!paymentMethod ? ' payment method' : ''} before booking.
        </Alert>
      )}
      <TextField
        label="Full Name"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
        margin="normal"
        fullWidth
      />
      <TextField
        label="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        margin="normal"
        fullWidth
      />
      <TextField
        label="Phone"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        margin="normal"
        fullWidth
      />
      <AddressField
        id="defaultPickup"
        label="Default Pickup Address"
        value={defaultPickup}
        onChange={setDefaultPickup}
        onFocus={auto.onFocus}
        onBlur={() => auto.onBlur()}
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
        helperText={
          oldPassword && !oldPasswordValid ? 'Incorrect password' : ''
        }
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
      <Tooltip
        title={
          newPassword === confirmPassword
            ? ''
            : 'new password and confirm password must match'
        }
        disableHoverListener={newPassword === confirmPassword}
      >
        <span>
          <Button
            type="submit"
            variant="contained"
            sx={{ mt: 2 }}
            disabled={newPassword !== confirmPassword}
          >
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
            {cardError && <Alert severity="error">{cardError}</Alert>}
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
  );
};

export default ProfileForm;
