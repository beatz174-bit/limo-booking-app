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
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const auth = await ensureFreshToken();
      if (!auth) return;
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await apiFetch(`${base}/users/me`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(!!data.onesignal_player_id);
        setPlayerId(data.onesignal_player_id ?? null);
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
      const newId = await subscribePush();
      if (!newId) return;
      const base = CONFIG.API_BASE_URL ?? '';
      await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onesignal_player_id: newId }),
      });
      setPlayerId(newId);
    } else {
      await unsubscribePush();
      const base = CONFIG.API_BASE_URL ?? '';
      await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onesignal_player_id: null }),
      });
      setPlayerId(null);
    }
    setEnabled(checked);
  };

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(async () => {
      const refreshed = await refreshPushToken();
      if (!refreshed || refreshed === playerId) return;
      const auth = await ensureFreshToken();
      if (!auth) return;
      const base = CONFIG.API_BASE_URL ?? '';
      await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onesignal_player_id: refreshed }),
      });
      setPlayerId(refreshed);
    }, 1000 * 60 * 60 * 24);
    return () => clearInterval(interval);
  }, [enabled, playerId, ensureFreshToken]);

  return (
    <FormControlLabel
      control={<Switch checked={enabled} onChange={handleChange} />}
      label="Push Notifications"
    />
  );
};

export default PushToggle;
