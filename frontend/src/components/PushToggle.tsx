import { useEffect, useState } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import {
  refreshPushToken,
  subscribePush,
  unsubscribePush,
} from '@/services/push';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';

interface Props {
  ensureFreshToken: () => Promise<string | null>;
}

const PushToggle = ({ ensureFreshToken }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const auth = await ensureFreshToken();
      if (!auth) return;
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await apiFetch(`${base}/users/me`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(!!data.fcm_token);
        setToken(data.fcm_token ?? null);
      }
    };
    load();
  }, [ensureFreshToken]);

  const handleChange = async (
    _e: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    const auth = await ensureFreshToken();
    if (!auth) return;
    if (checked) {
      const newToken = await subscribePush();
      if (!newToken) return;
      const base = CONFIG.API_BASE_URL ?? '';
      await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcm_token: newToken }),
      });
      setToken(newToken);
    } else {
      await unsubscribePush();
      const base = CONFIG.API_BASE_URL ?? '';
      await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcm_token: null }),
      });
      setToken(null);
    }
    setEnabled(checked);
  };

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(async () => {
      const refreshed = await refreshPushToken();
      if (!refreshed || refreshed === token) return;
      const auth = await ensureFreshToken();
      if (!auth) return;
      const base = CONFIG.API_BASE_URL ?? '';
      await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcm_token: refreshed }),
      });
      setToken(refreshed);
    }, 1000 * 60 * 60 * 24);
    return () => clearInterval(interval);
  }, [enabled, token, ensureFreshToken]);

  return (
    <FormControlLabel
      control={<Switch checked={enabled} onChange={handleChange} />}
      label="Push Notifications"
    />
  );
};

export default PushToggle;
