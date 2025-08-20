// Development helper page showing runtime config.
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import { CONFIG } from '@/config';
import { useDevFeatures } from '@/contexts/DevFeaturesContext';
const DevNotes: React.FC = () => {
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
          <ListItemText primary="Google Maps API key" secondary={CONFIG.GOOGLE_MAPS_API_KEY || '(not set)'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="ORS API key" secondary={CONFIG.ORS_API_KEY || '(not set)'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="JWT SECRET key" secondary={CONFIG.JWT_SECRET_KEY || '(not set)'} />
        </ListItem>
      </List>
      <Typography variant="body2" color="text.secondary">
        For local development, ensure the backend is running and the Google Maps API key is set. You can register a new account
        or seed an admin user via the <code>/setup</code> API.
      </Typography>
    </Box>
  );
};

export default DevNotes;
