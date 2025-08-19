// Development helper page showing runtime config.
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';

import { CONFIG } from '@/config';

const FRONTEND_ENV_VARS = [
  'ENV',
  'BACKEND_URL',
  'FRONTEND_URL',
  'VITE_API_BASE_URL',
  'VITE_CDN_BASE_URL',
  'VITE_ASSET_BASE',
  'GOOGLE_MAPS_API_KEY',
  'VITE_OAUTH_CLIENT_ID',
  'VITE_OAUTH_AUTHORIZE_URL',
  'VITE_OAUTH_TOKEN_URL',
  'VITE_OAUTH_REDIRECT_URI',
  'E2E_BASE_URL',
  'API_BASE_URL',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
];

const BACKEND_ENV_VARS = [
  'ENV',
  'CORS_ALLOW_ORIGINS',
  'ORS_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'JWT_SECRET_KEY',
  'DATABASE_PATH',
  'PROJECT_NAME',
  'PROJECT_VERSION',
  'API_PREFIX',
  'DEBUG',
  'DB_POOL_SIZE',
  'DB_MAX_OVERFLOW',
  'DB_POOL_RECYCLE',
  'VITE_API_BASE_URL',
  'VITE_CDN_BASE_URL',
];

const DevNotes: React.FC = () => {
  const env = import.meta.env as Record<string, string | undefined>;

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        Developer Notes
      </Typography>
      <Typography variant="body1" paragraph>
        Runtime configuration values from <code>src/config.ts</code>.
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary="API base URL" secondary={CONFIG.API_BASE_URL || '(not set)'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="CDN base URL" secondary={CONFIG.CDN_BASE_URL || '(not set)'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="OAuth client ID" secondary={CONFIG.OAUTH_CLIENT_ID || '(not set)'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="OAuth authorize URL" secondary={CONFIG.OAUTH_AUTHORIZE_URL || '(not set)'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="OAuth token URL" secondary={CONFIG.OAUTH_TOKEN_URL || '(not set)'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="OAuth redirect URI" secondary={CONFIG.OAUTH_REDIRECT_URI || '(not set)'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="Google Maps API key" secondary={CONFIG.GOOGLE_MAPS_API_KEY ? 'configured' : '(not set)'} />
        </ListItem>
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h5" gutterBottom>
        Frontend Environment Variables
      </Typography>
      <List>
        {FRONTEND_ENV_VARS.map((key) => (
          <ListItem key={`fe-${key}`}>
            <ListItemText primary={key} secondary={env[key] || '(not set)'} />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h5" gutterBottom>
        Backend Environment Variables
      </Typography>
      <List>
        {BACKEND_ENV_VARS.map((key) => (
          <ListItem key={`be-${key}`}>
            <ListItemText primary={key} secondary="(server only)" />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" color="text.secondary">
        For local development, ensure the backend is running and the Google Maps API key is set. You can register a new account
        or seed an admin user via the <code>/setup</code> API.
      </Typography>
    </Box>
  );
};

export default DevNotes;
