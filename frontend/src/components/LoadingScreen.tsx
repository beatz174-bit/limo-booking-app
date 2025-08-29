import Box from '@mui/material/Box';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { keyframes } from '@emotion/react';

const drive = keyframes`
  0% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
`;

const LoadingScreen: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      overflow: 'hidden',
    }}
    data-testid="loading-screen"
  >
    <DirectionsCarIcon
      sx={{ fontSize: 64, animation: `${drive} 2s linear infinite` }}
    />
  </Box>
);

export default LoadingScreen;
