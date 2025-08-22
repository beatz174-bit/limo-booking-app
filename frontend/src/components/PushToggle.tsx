import { useEffect, useState } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import { subscribePush, unsubscribePush } from '@/services/push';
import { CONFIG } from '@/config';

interface Props {
  ensureFreshToken: () => Promise<string | null>;
}

const PushToggle = ({ ensureFreshToken }: Props) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const auth = await ensureFreshToken();
      if (!auth) return;
      const res = await fetch(`${CONFIG.API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${auth}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(!!data.fcm_token);
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
      const token = await subscribePush();
      if (!token) return;
      await fetch(`${CONFIG.API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify({ fcm_token: token }),
      });
    } else {
      await unsubscribePush();
      await fetch(`${CONFIG.API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify({ fcm_token: null }),
      });
    }
    setEnabled(checked);
  };

  return (
    <FormControlLabel
      control={<Switch checked={enabled} onChange={handleChange} />}
      label="Push Notifications"
    />
  );
};

export default PushToggle;
