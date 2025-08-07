import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

const NavBar: React.FC = () => {
  const { logout, userName, userID } = useAuth();  // get logout (and maybe user info) from context
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Handlers to open/close menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Logout handler
  const handleLogout = () => {
    logout();            // clear auth state
    handleMenuClose();   // close the menu
    navigate('/login');  // navigate to login page after logout
  };

  const navBook = () => {
    handleMenuClose();
    navigate('/book');
  };

  const navHistory = () => {
    handleMenuClose();
    navigate('/history');
  };

  const navAdmin = () => {
    handleMenuClose();
    navigate('/admin')
  }

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        {/* App name/Logo on the left */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          { userName ? `Welcome, ${userName}` : 'userName is missing...'} {/* or your app name/brand */}
        </Typography>

        {/* Account icon button on right */}
        <IconButton 
          size="large"
          edge="end"
          color="inherit"
          aria-label="account"
          aria-controls="account-menu"   // accessibility identifiers
          aria-haspopup="true"
          onClick={handleMenuOpen}
        >
          <AccountCircle /> {/* user/account icon */}
        </IconButton>

        {/* Dropdown Menu for account options */}
        <Menu
          id="account-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}     
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}  
        >
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
          <MenuItem onClick={navBook}>Book</MenuItem>
          <MenuItem onClick={navHistory}>History</MenuItem>
          {userID == '1' && (
            <MenuItem onClick={navAdmin}>Administration</MenuItem>
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;