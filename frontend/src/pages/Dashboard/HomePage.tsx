import { Grid, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Tile {
  label: string;
  path: string;
}

export default function HomePage() {
  const { userID, adminID } = useAuth();

  const tiles: Tile[] = [
    { label: 'Book a Ride', path: '/book' },
    { label: 'Ride History', path: '/history' },
    { label: 'Profile', path: '/me' },
  ];

  if (userID && userID === adminID) {
    tiles.splice(2, 0, { label: 'Driver Dashboard', path: '/driver' });
    tiles.splice(3, 0, { label: 'Availability', path: '/driver/availability' });
    tiles.push({ label: 'Admin Dashboard', path: '/admin' });
  }

  return (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {tiles.map((tile) => (
        <Grid item xs={12} sm={6} md={4} key={tile.path}>
          <Button
            component={Link}
            to={tile.path}
            variant="contained"
            fullWidth
            sx={{ height: 120 }}
          >
            <Typography variant="h6">{tile.label}</Typography>
          </Button>
        </Grid>
      ))}
    </Grid>
  );
}

