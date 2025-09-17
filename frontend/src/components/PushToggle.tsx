import { useEffect, useState } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import { onPushSubscriptionChange, subscribePush, unsubscribePush } from '@/services/push';
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
        console.log('Fetched onesignal_player_id', data.onesignal_player_id);
        setEnabled(!!data.onesignal_player_id);
        setPlayerId(data.onesignal_player_id ?? null);
      } else {
        const body = res.text ? await res.text() : '';
        console.log('Failed to fetch /users/me', res.status, body);
      }
    };
    load();
  }, [ensureFreshToken]);

  const handleChange = async (
    _e: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    console.log('Push toggle desired state', checked);
    const auth = await ensureFreshToken();
    if (!auth) return;
    if (checked) {
      const newId = await subscribePush();
      console.log('New player ID', newId);
      if (!newId) return;
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onesignal_player_id: newId }),
      });
      const body = res.text ? await res.text() : '';
      console.log('PATCH /users/me', res.status, body);
      setPlayerId(newId);
    } else {
      await unsubscribePush();
      console.log('New player ID', null);
      const base = CONFIG.API_BASE_URL ?? '';
      const res = await apiFetch(`${base}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onesignal_player_id: null }),
      });
      const body = res.text ? await res.text() : '';
      console.log('PATCH /users/me', res.status, body);
      setPlayerId(null);
    }
    setEnabled(checked);
  };

  useEffect(() => {
    const unsubscribe = onPushSubscriptionChange((id) => {
      console.log('Observed subscription change', id);
      setEnabled(!!id);
      setPlayerId(id);
    });
    return unsubscribe;
  }, []);

  return (
    <FormControlLabel
      control={<Switch checked={enabled} onChange={handleChange} />}
      label="Push Notifications"
    />
  );
};

export default PushToggle;
